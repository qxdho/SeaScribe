# -*- coding: utf-8 -*-
"""SeaScribe 调试启动脚本。

行为：
1. 探测本地 9060 端口，判断 SeaScribe 服务器是否在运行
2. 未运行 → 先启动服务器（隐藏窗口），轮询等待就绪
3. 运行 debug_api.py 全量调试（命令行参数原样透传）
4. 若服务器由本脚本启动，调试结束后自动关闭；原本就在运行的服务器不动

用法：
  python debug_run.py                 # 完整调试（交互输入 admin 密码）
  python debug_run.py --skip-online   # 只做离线检查
  python debug_run.py --list          # 打印用例清单
  双击 debug.bat 等价于本脚本
"""

import os
import socket
import subprocess
import sys
import time

BASE = os.path.dirname(os.path.abspath(__file__))
PORT = 9060
HOST = '127.0.0.1'
START_TIMEOUT = 15  # 启动等待秒数


def say(msg):
    """带 flush 的输出，保证管道/重定向/双击窗口下实时可见。"""
    print(msg, flush=True)


def server_running():
    """探测 9060 端口是否可连接。"""
    try:
        with socket.create_connection((HOST, PORT), timeout=1.0):
            return True
    except OSError:
        return False


def start_server():
    """后台启动服务器（Windows 隐藏窗口），返回 Popen 句柄。"""
    if sys.platform == 'win32':
        flags = subprocess.CREATE_NO_WINDOW
    else:
        flags = 0
    return subprocess.Popen(
        [sys.executable, 'main/server.py', str(PORT)],
        cwd=BASE, creationflags=flags,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def wait_ready(timeout=START_TIMEOUT):
    """轮询等待服务器就绪，超时返回 False。"""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if server_running():
            return True
        time.sleep(0.5)
    return False


def main():
    args = sys.argv[1:]
    say('== SeaScribe 调试启动脚本 ==')
    if server_running():
        say('[检测] 服务器已在运行（http://localhost:%d），直接开始调试' % PORT)
        self_started = False
    else:
        say('[检测] 服务器未运行，正在启动…')
        proc = start_server()
        if not wait_ready():
            say('[错误] 服务器启动超时（%d 秒），请手动运行 start.bat 后重试' % START_TIMEOUT)
            return 3
        say('[检测] 服务器已就绪（PID %d）' % proc.pid)
        self_started = True

    say('-- 执行 debug_api.py（参数：%s）--' % (' '.join(args) if args else '(无)'))
    code = subprocess.call([sys.executable, 'debug_api.py'] + args, cwd=BASE)

    if self_started:
        say('-- 调试结束，关闭本次启动的服务器 --')
        try:
            proc.terminate()
            proc.wait(timeout=5)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass
        say('[完成] 本次启动的服务器已关闭（原本在运行的服务器不受影响）')

    say('调试退出码：%d' % code)
    return code


if __name__ == '__main__':
    sys.exit(main())
