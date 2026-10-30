"""Local Xbox mouse with optional desktop fallback. No HTTP mouse commands."""
import ctypes
import math
import sys
import threading
import time
from controller_pointer_guard import windows_motion_guard

VIEW, A, B = 0x0020, 0x1000, 0x2000


class MouseEngine:
    """Pure state machine; tests inject a fake output, never desktop input."""
    def __init__(self, emit, desktop=False):
        self.emit = emit
        self.desktop = desktop
        self.mode = "system" if desktop else "web"
        self.page_mode = "web"
        self.focused = False
        self.slot = None
        self.previous = {}
        self.armed = False
        self.last_input = self.started = 0
        self.fraction = [0.0, 0.0]

    def reset(self):
        self.mode, self.slot, self.armed = "system" if self.desktop else "web", None, False
        self.fraction = [0.0, 0.0]

    def step(self, pads, active, alive, now, dt, focused=None):
        old = self.previous
        self.previous = {slot: pad[0] for slot, pad in pads.items()}
        if self.desktop:
            return self.desktop_step(pads, old, active, active if focused is None else focused, now, dt)
        if self.mode == "system" and (self.slot not in pads or not alive or
                                      now - self.last_input > 120 or now - self.started > 1800):
            self.reset()
        # A held View on startup/reconnection is not a fresh press.
        for slot, (buttons, _, _) in pads.items():
            fresh = slot in old and buttons & VIEW and not old[slot] & VIEW
            if fresh and (self.mode == "system" and slot == self.slot or self.mode == "web" and active):
                if self.mode == "system":
                    self.reset()
                else:
                    self.mode, self.slot = "system", slot
                    self.armed = False
                    self.last_input = self.started = now
                return
        if self.mode != "system":
            return
        self.output(pads, old, now, dt)

    def desktop_step(self, pads, old, active, focused, now, dt):
        # Desktop output never needs a web lease. Only a focused learning page
        # can toggle View; leaving it always restores desktop control.
        desired = self.page_mode if focused else "system"
        changed = focused != self.focused or desired != self.mode or self.slot not in pads
        self.focused, self.mode = focused, desired
        if not pads:
            self.slot, self.armed = None, False
            self.fraction = [0.0, 0.0]
            return
        if self.slot not in pads:
            self.slot = next(iter(pads))
        if changed:
            self.armed = False
            self.fraction = [0.0, 0.0]
        buttons = pads[self.slot][0]
        if active and self.slot in old and buttons & VIEW and not old[self.slot] & VIEW:
            self.page_mode = self.mode = "web" if self.page_mode == "system" else "system"
            self.armed = False
            self.fraction = [0.0, 0.0]
            return
        # A focused key-binding capture must not become desktop clicks/motion.
        if self.mode == "system" and (not focused or active):
            self.output(pads, old, now, dt)
        else:
            self.armed = False

    def output(self, pads, old, now, dt):
        buttons, x, y = pads[self.slot]
        def strength(value):
            return math.copysign((min(1, abs(value)) - .25) / .75, value) if abs(value) > .25 else 0
        x, y = strength(x), -strength(y)  # XInput Y is up-positive.
        if not self.armed:
            self.armed = not buttons and not x and not y
            return
        length = max(1, math.hypot(x, y))
        if buttons or x or y:
            self.last_input = now
        for i, value in enumerate((x, y)):
            self.fraction[i] += value / length * 900 * max(0, min(.05, dt))
        dx, dy = (math.trunc(v) for v in self.fraction)
        self.fraction[0] -= dx
        self.fraction[1] -= dy
        if dx or dy:
            self.emit("move", dx, dy)
        for mask, kind in ((A, "left"), (B, "right")):
            if buttons & mask and not old.get(self.slot, 0) & mask:
                self.emit(kind, 0, 0)  # Complete down/up pair; never hold a mouse button.


class Gamepad(ctypes.Structure):
    _fields_ = [("buttons", ctypes.c_uint16), ("lt", ctypes.c_ubyte), ("rt", ctypes.c_ubyte),
                ("lx", ctypes.c_int16), ("ly", ctypes.c_int16), ("rx", ctypes.c_int16), ("ry", ctypes.c_int16)]


class State(ctypes.Structure):
    _fields_ = [("packet", ctypes.c_uint32), ("pad", Gamepad)]


def windows_io():
    if sys.platform != "win32":
        return None
    query = None
    for name in ("xinput1_4.dll", "xinput1_3.dll"):
        try:
            query = ctypes.WinDLL(name).XInputGetState
            query.argtypes = [ctypes.c_uint32, ctypes.POINTER(State)]
            query.restype = ctypes.c_uint32
            break
        except (OSError, AttributeError):
            continue
    if query is None:
        return None
    class MouseInput(ctypes.Structure):
        _fields_ = [("dx", ctypes.c_int32), ("dy", ctypes.c_int32), ("data", ctypes.c_uint32),
                    ("flags", ctypes.c_uint32), ("time", ctypes.c_uint32), ("extra", ctypes.c_size_t)]
    class InputUnion(ctypes.Union):
        _fields_ = [("mouse", MouseInput)]
    class Input(ctypes.Structure):
        _fields_ = [("type", ctypes.c_uint32), ("value", InputUnion)]
    send = ctypes.WinDLL("user32", use_last_error=True).SendInput
    send.argtypes = [ctypes.c_uint32, ctypes.POINTER(Input), ctypes.c_int]
    send.restype = ctypes.c_uint32
    def read():
        pads = {}
        for slot in range(4):
            state = State()
            if query(slot, ctypes.byref(state)) == 0:
                pads[slot] = (state.pad.buttons, state.pad.rx / 32768, state.pad.ry / 32768)
        return pads
    def emit(kind, dx, dy):
        flags = (1,) if kind == "move" else (2, 4) if kind == "left" else (8, 16)
        records = (Input * len(flags))(*(Input(0, InputUnion(MouseInput(dx, dy, 0, f, 0, 0))) for f in flags))
        sent = send(len(records), records, ctypes.sizeof(Input))
        if sent != len(records):
            if kind != "move" and sent:
                # Best-effort release if Windows accepted only the down event.
                release = Input(0, InputUnion(MouseInput(0, 0, 0, flags[-1], 0, 0)))
                send(1, ctypes.byref(release), ctypes.sizeof(Input))
            raise OSError("Windows rejected controller mouse input")
    return read, emit


class ControllerMouse:
    def __init__(self, disabled=False, io_factory=windows_io, guard_factory=windows_motion_guard, desktop=False):
        self.disabled, self.io_factory = disabled, io_factory
        self.desktop = desktop
        self.guard_factory, self.guard = guard_factory, None
        self.lock = threading.RLock()
        self.stop = threading.Event()
        self.clients = {}
        self.focus_clients = {}
        self.worker = None
        self.engine = None
        self.supported = False
        self.reason = "disabled" if disabled else "not-started"
        self.output_failed = False
        if desktop:
            self.start()

    def start(self):
        with self.lock:
            if self.worker is None and not self.disabled:
                io = self.io_factory()
                if io:
                    self.guard = self.guard_factory()
                    self.engine = MouseEngine(io[1], desktop=self.desktop)
                    self.supported = True
                    self.reason = ""
                    self.worker = threading.Thread(target=self.run, args=(io[0],), daemon=True)
                    self.worker.start()
                else:
                    self.reason = "unsupported"

    def attach(self, client, active, focused=None):
        with self.lock:
            now = time.monotonic()
            self.clients = {k: v for k, v in self.clients.items() if now - v[0] < 5}
            if client not in self.clients and len(self.clients) >= 16:
                raise ValueError("Too many clients")
            self.clients[client] = (now, active)
            self.focus_clients = {k: v for k, v in self.focus_clients.items() if k in self.clients}
            self.focus_clients[client] = (now, active if focused is None else focused)
            self.start()
            if self.guard:
                self.guard.authorize(client, active)
            return self.status()

    def status(self):
        with self.lock:
            return {"supported": self.supported, "mode": self.engine.mode if self.engine else "web",
                    "motionGuard": bool(self.guard and self.guard.installed), "reason": self.reason}

    def read_failed(self, reason):
        with self.lock:
            self.engine.reset()
            self.engine.previous = {}  # Reconnected/held View cannot become a fresh edge.
            self.supported = False
            self.reason = reason
            if self.guard:
                self.guard.update("web", False)

    def poll_once(self, read, last):
        # USB removal / wireless reconnection can stall XInput. Do not hold the
        # HTTP lease lock while reading, and never permanently kill the worker.
        before_read = time.monotonic()
        try:
            pads = read()
        except Exception:
            self.read_failed("controller-read-failed")
            return time.monotonic(), False
        after_read = time.monotonic()
        if after_read - before_read > .25:
            self.read_failed("controller-read-timeout")
            return after_read, False  # Discard stale buttons and movement.
        with self.lock:
            if not self.output_failed:
                self.supported, self.reason = True, ""
                active = any(enabled and after_read - at < 1.5 for at, enabled in self.clients.values())
                alive = any(after_read - at < 5 for at, _ in self.clients.values())
                focused = any(enabled and after_read - at < 1.5 for at, enabled in self.focus_clients.values())
                try:
                    self.engine.step(pads, active, alive, after_read, after_read - last, focused=focused if self.desktop else None)
                except Exception:
                    # Never repeatedly retry rejected desktop output. Web-only
                    # guarding still needs fresh read-only connection samples.
                    self.output_failed = True
                    self.engine.reset()
                    self.engine.previous = {}
            if self.output_failed:
                self.supported, self.reason = False, "native-output-failed"
            if self.guard:
                self.guard.update(self.engine.mode, bool(pads))
        return after_read, True

    def run(self, read):
        last = time.monotonic()
        while not self.stop.wait(1 / 60):
            last, fresh = self.poll_once(read, last)
            if not fresh and self.stop.wait(.5):
                break  # Back off transient failures; shutdown remains immediate.

    def close(self):
        self.stop.set()
        if self.worker:
            self.worker.join(timeout=1)
        with self.lock:
            if self.engine:
                self.engine.reset()
            if self.guard:
                self.guard.close()
