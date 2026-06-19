import pygame
import subprocess
import sys
import os
import threading
import time
import math

# ===============================
# CONFIG
# ===============================

WIDTH = 1100
HEIGHT = 700
FPS = 60

BG = (8, 15, 30)
PANEL = (15, 35, 65)
BLUE = (0, 180, 255)
WHITE = (200, 220, 255)
GREEN = (0, 255, 140)
LOG_BG = (25, 65, 110)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ===============================
# INIT
# ===============================

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("SECURE CLIENT NODE")

clock = pygame.time.Clock()

font_small = pygame.font.SysFont("consolas", 15)
font_medium = pygame.font.SysFont("consolas", 20)
font_large = pygame.font.SysFont("consolas", 30)

client_logs = []
is_running = False
log_scroll = 0

LOG_PANEL_RECT = pygame.Rect(50, 240, WIDTH - 100, HEIGHT - 300)
LINE_HEIGHT = 22

# ===============================
# UI HELPERS
# ===============================

def draw_glow_rect(rect, color):
    glow = pygame.Surface((rect.width + 20, rect.height + 20), pygame.SRCALPHA)
    pygame.draw.rect(glow, (*color, 40), glow.get_rect(), border_radius=12)
    screen.blit(glow, (rect.x - 10, rect.y - 10))
    pygame.draw.rect(screen, color, rect, border_radius=10)

def draw_button(rect, text):
    draw_glow_rect(rect, BLUE)
    label = font_medium.render(text, True, BG)
    screen.blit(label, (
        rect.x + rect.width // 2 - label.get_width() // 2,
        rect.y + rect.height // 2 - label.get_height() // 2
    ))

def draw_logs():
    global log_scroll

    pygame.draw.rect(screen, LOG_BG, LOG_PANEL_RECT, border_radius=10)

    # Clip drawing to panel
    screen.set_clip(LOG_PANEL_RECT)

    total_lines = len(client_logs)
    visible_lines = LOG_PANEL_RECT.height // LINE_HEIGHT

    max_scroll = max(0, total_lines - visible_lines)

    log_scroll = max(0, min(log_scroll, max_scroll))

    start_index = log_scroll
    end_index = min(total_lines, start_index + visible_lines)

    y = LOG_PANEL_RECT.y + 10

    for i in range(start_index, end_index):
        text_surface = font_small.render(client_logs[i], True, WHITE)
        screen.blit(text_surface, (LOG_PANEL_RECT.x + 15, y))
        y += LINE_HEIGHT

    screen.set_clip(None)

# ===============================
# SCRIPT EXECUTION
# ===============================

def run_script(script_name):
    global is_running

    if is_running:
        return

    is_running = True
    client_logs.append(f"> Running {script_name}...")

    def task():
        global is_running
        try:
            result = subprocess.run(
                [sys.executable, script_name],
                capture_output=True,
                text=True,
                cwd=BASE_DIR
            )

            if result.stdout:
                for line in result.stdout.splitlines():
                    client_logs.append(line)

            if result.stderr:
                for line in result.stderr.splitlines():
                    client_logs.append("ERROR: " + line)

        except Exception as e:
            client_logs.append("Exception: " + str(e))

        is_running = False

    threading.Thread(target=task).start()

# ===============================
# BUTTONS
# ===============================

send_button = pygame.Rect(120, 140, 260, 60)
receive_button = pygame.Rect(420, 140, 260, 60)
train_button = pygame.Rect(720, 140, 260, 60)

# ===============================
# BACKGROUND ANIMATION
# ===============================

def animated_background(t):
    for i in range(5):
        radius = 200 + i * 40
        alpha = 30 + int(20 * math.sin(t + i))
        surface = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        pygame.draw.circle(surface, (0, 100, 180, alpha), (WIDTH//2, HEIGHT//2), radius, 2)
        screen.blit(surface, (0, 0))

# ===============================
# MAIN LOOP
# ===============================

running = True

while running:
    clock.tick(FPS)
    t = time.time()

    screen.fill(BG)
    animated_background(t)

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        if event.type == pygame.MOUSEBUTTONDOWN:

            # Scroll with mouse wheel
            if event.button == 4:  # scroll up
                log_scroll -= 2

            if event.button == 5:  # scroll down
                log_scroll += 2

            if send_button.collidepoint(event.pos):
                run_script("send_grpc.py")

            if receive_button.collidepoint(event.pos):
                run_script("request_global.py")

            if train_button.collidepoint(event.pos):
                run_script("train.py")

    # HEADER
    header = font_large.render("SECURE FEDERATED CLIENT NODE", True, BLUE)
    screen.blit(header, (WIDTH//2 - header.get_width()//2, 40))

    status_text = "BUSY" if is_running else "READY"
    status_color = GREEN if not is_running else (255, 120, 120)
    status_surface = font_medium.render(f"STATUS: {status_text}", True, status_color)
    screen.blit(status_surface, (WIDTH - 200, 40))

    # BUTTONS
    draw_button(send_button, "SEND ENCRYPTED LoRA")
    draw_button(receive_button, "RECEIVE GLOBAL MODEL")
    draw_button(train_button, "TRAIN LOCAL MODEL")

    # LOG TITLE
    log_title = font_medium.render("CLIENT ACTIVITY LOG", True, BLUE)
    screen.blit(log_title, (50, 210))

    draw_logs()

    pygame.display.flip()

pygame.quit()