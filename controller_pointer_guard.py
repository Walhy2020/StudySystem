"""Keep software-injected motion and button clicks out of web-cursor mode.

Physical mouse input is never blocked. No cursor warping, clipping, keyboard
hooks, JoyXoff configuration changes, or persistent Windows settings are used.
"""
import ctypes
from ctypes import wintypes
import sys
import threading
import time

BUTTON_DOWN = {0x0201: "left", 0x0203: "left", 0x0204: "right", 0x0206: "right",
               0x0207: "middle", 0x0209: "middle", 0x020B: "extra", 0x020D: "extra"}
BUTTON_UP = {0x0202: "left", 0x0205: "right", 0x0208: "middle", 0x020C: "extra"}
MOUSE_MESSAGES = {0x0200, *BUTTON_DOWN, *BUTTON_UP}


class MotionPolicy:
    def __init__(self):
        self.leases = {}
        self.web = False
        self.connected = False
        self.blocked_buttons = set()

    def authorize(self, client, active, foreground, now):
        leases = {key: value for key, value in self.leases.items() if value[1] > now}
        if active and foreground:
            leases[client] = (foreground, now + 1.0)
        else:
            leases.pop(client, None)
        self.leases = leases

    def blocks(self, message, flags, foreground, now):
        # Hardware input always passes. Pair rejected injected downs with their
        # ups even across View/focus changes; never eat an up for an allowed down.
        if not flags & 1:
            return False
        if message in BUTTON_UP:
            button = BUTTON_UP[message]
            if button not in self.blocked_buttons:
                return False
            self.blocked_buttons.remove(button)
            return True
        guarded = (self.web and self.connected and bool(foreground)
                   and any(window == foreground and until > now
                           for window, until in self.leases.values()))
        if message in BUTTON_DOWN:
            button = BUTTON_DOWN[message]
            if guarded or button in self.blocked_buttons:
                self.blocked_buttons.add(button)
                return True
            return False
        return message == 0x0200 and guarded


class WindowsMotionGuard:
    def __init__(self):
        self.policy = MotionPolicy()
        self.ready = threading.Event()
        self.installed = False
        self.thread_id = None
        self.user = ctypes.WinDLL("user32", use_last_error=True)
        self.user.GetForegroundWindow.restype = wintypes.HWND
        self.thread = threading.Thread(target=self.run, daemon=True)
        self.thread.start()
        self.ready.wait(1)

    def authorize(self, client, active):
        self.policy.authorize(client, active, self.user.GetForegroundWindow(), time.monotonic())

    def update(self, mode, connected):
        self.policy.web, self.policy.connected = mode == "web", connected

    def run(self):
        callback_type = ctypes.WINFUNCTYPE(ctypes.c_ssize_t, ctypes.c_int,
                                          wintypes.WPARAM, wintypes.LPARAM)

        class MouseRecord(ctypes.Structure):
            _fields_ = [("point", wintypes.POINT), ("data", wintypes.DWORD),
                        ("flags", wintypes.DWORD), ("time", wintypes.DWORD),
                        ("extra", ctypes.c_size_t)]

        user = self.user
        user.SetWindowsHookExW.argtypes = [ctypes.c_int, callback_type, wintypes.HINSTANCE, wintypes.DWORD]
        user.SetWindowsHookExW.restype = wintypes.HANDLE
        user.CallNextHookEx.argtypes = [wintypes.HANDLE, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM]
        user.CallNextHookEx.restype = ctypes.c_ssize_t
        user.UnhookWindowsHookEx.argtypes = [wintypes.HANDLE]
        kernel = ctypes.WinDLL("kernel32")
        kernel.GetModuleHandleW.restype = wintypes.HMODULE
        hook = None

        @callback_type
        def callback(code, message, data):
            try:
                if code >= 0 and message in MOUSE_MESSAGES:
                    flags = ctypes.cast(data, ctypes.POINTER(MouseRecord)).contents.flags
                    if self.policy.blocks(message, flags, user.GetForegroundWindow(), time.monotonic()):
                        return 1
            except Exception:
                pass  # Fail open: never strand the user's pointer after an error.
            return user.CallNextHookEx(None, code, message, data)

        try:
            self.thread_id = kernel.GetCurrentThreadId()
            message = wintypes.MSG()
            user.PeekMessageW(ctypes.byref(message), None, 0, 0, 0)  # Create shutdown queue before ready.
            hook = user.SetWindowsHookExW(14, callback, kernel.GetModuleHandleW(None), 0)
            self.installed = bool(hook)
            self.ready.set()
            if hook:
                while user.GetMessageW(ctypes.byref(message), None, 0, 0) > 0:
                    user.TranslateMessage(ctypes.byref(message))
                    user.DispatchMessageW(ctypes.byref(message))
        finally:
            self.installed = False
            self.policy.web = False
            if hook:
                user.UnhookWindowsHookEx(hook)
            self.ready.set()

    def close(self):
        self.policy.web = False
        if self.thread_id:
            self.user.PostThreadMessageW(self.thread_id, 0x0012, 0, 0)
        self.thread.join(timeout=1)


def windows_motion_guard():
    return WindowsMotionGuard() if sys.platform == "win32" else None
