"""Read-only Windows XInput controller battery levels (not PC battery)."""
import ctypes
import sys


class BatteryInformation(ctypes.Structure):
    _fields_ = [("type", ctypes.c_ubyte), ("level", ctypes.c_ubyte)]


def read_controller_batteries(query=None):
    if query is None:
        if sys.platform != "win32":
            return {"supported": False, "controllers": []}
        for name in ("xinput1_4.dll", "xinput1_3.dll"):
            try:
                query = ctypes.WinDLL(name).XInputGetBatteryInformation
                query.argtypes = [ctypes.c_uint32, ctypes.c_ubyte, ctypes.POINTER(BatteryInformation)]
                query.restype = ctypes.c_uint32
                break
            except (OSError, AttributeError):
                continue
        if query is None:
            return {"supported": False, "controllers": []}
    controllers = []
    for index in range(4):
        info = BatteryInformation()
        if query(index, 0, ctypes.byref(info)) != 0 or info.type == 0:
            continue
        level = ({0: "empty", 1: "low", 2: "medium", 3: "full"}.get(info.level, "unknown")
                 if info.type in (2, 3) else "wired" if info.type == 1 else "unknown")
        controllers.append({"slot": index + 1, "level": level})
    return {"supported": True, "controllers": controllers}
