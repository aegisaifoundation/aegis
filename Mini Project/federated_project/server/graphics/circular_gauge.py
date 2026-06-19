import pygame
import math
import time

# Base Colors
CPU_NORMAL = (0, 255, 170)
CPU_HIGH = (255, 60, 60)

MEM_NORMAL = (0, 200, 255)
MEM_HIGH = (255, 200, 0)

NET_COLOR = (180, 0, 255)

GLOW = (0, 180, 140)
DIM = (0, 70, 60)
SOFT = (0, 40, 35)


def draw_hexagon(surface, center, radius, rotation):
    cx, cy = center
    points = []
    for i in range(6):
        angle = math.radians(i * 60 + rotation)
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        points.append((x, y))
    pygame.draw.polygon(surface, GLOW, points, 1)


def draw_circular_gauge(surface, center, radius, cpu_percent,
                        mem_percent=None, net_percent=None):

    cx, cy = center
    t = time.time()

    # ---------------- COLOR LOGIC ----------------
    cpu_color = CPU_HIGH if cpu_percent >= 80 else CPU_NORMAL
    mem_color = MEM_HIGH if mem_percent and mem_percent >= 75 else MEM_NORMAL

    # ================= OUTER BREATHING GLOW =================
    breathe = 5 * math.sin(t * 2)
    pygame.draw.circle(surface, SOFT, center, int(radius + 30 + breathe), 1)

    # ================= ROTATING HEXAGON =================
    draw_hexagon(surface, center, radius + 45, t * 40)

    # ================= PARTICLE RING =================
    for i in range(0, 360, 15):
        angle = math.radians(i + t * 50)
        x = cx + (radius + 28) * math.cos(angle)
        y = cy + (radius + 28) * math.sin(angle)
        pygame.draw.circle(surface, cpu_color, (int(x), int(y)), 2)

    # ================= BASE RING =================
    pygame.draw.circle(surface, DIM, center, radius, 2)

    # ================= CPU OUTER ARC =================
    segments = 80
    filled = int((cpu_percent / 100) * segments)

    for i in range(filled):
        angle = math.radians((i / segments) * 360 - 90)
        x = cx + radius * math.cos(angle)
        y = cy + radius * math.sin(angle)
        pygame.draw.circle(surface, cpu_color, (int(x), int(y)), 3)

    # ================= MEMORY ARC =================
    if mem_percent is not None:
        mem_radius = radius - 18
        pygame.draw.circle(surface, DIM, center, mem_radius, 1)

        mem_segments = 60
        mem_filled = int((mem_percent / 100) * mem_segments)

        for i in range(mem_filled):
            angle = math.radians((i / mem_segments) * 360 - 90)
            x = cx + mem_radius * math.cos(angle)
            y = cy + mem_radius * math.sin(angle)
            pygame.draw.circle(surface, mem_color, (int(x), int(y)), 2)

    # ================= NETWORK ARC (NEW) =================
    if net_percent is not None:
        net_radius = radius - 32
        pygame.draw.circle(surface, DIM, center, net_radius, 1)

        net_segments = 50
        net_filled = int((net_percent / 100) * net_segments)

        for i in range(net_filled):
            angle = math.radians((i / net_segments) * 360 - 90)
            x = cx + net_radius * math.cos(angle)
            y = cy + net_radius * math.sin(angle)
            pygame.draw.circle(surface, NET_COLOR, (int(x), int(y)), 2)

    # ================= COUNTER ROTATING ARC =================
    for i in range(0, 360, 10):
        angle = math.radians(i - t * 80)
        x = cx + (radius - 10) * math.cos(angle)
        y = cy + (radius - 10) * math.sin(angle)
        pygame.draw.circle(surface, GLOW, (int(x), int(y)), 1)

    # ================= RADIAL TICKS =================
    for i in range(0, 360, 30):
        angle = math.radians(i)
        x1 = cx + (radius + 5) * math.cos(angle)
        y1 = cy + (radius + 5) * math.sin(angle)
        x2 = cx + (radius + 12) * math.cos(angle)
        y2 = cy + (radius + 12) * math.sin(angle)
        pygame.draw.line(surface, GLOW, (x1, y1), (x2, y2), 1)

    # ================= ENERGY PULSE =================
    pulse = (t * 100) % (radius + 40)
    pygame.draw.circle(surface, GLOW, center, int(pulse), 1)

    # ================= INNER CORE =================
    inner = 15 + 3 * math.sin(t * 6)
    pygame.draw.circle(surface, cpu_color, center, int(inner), 1)

    # ================= TEXT =================
    font_main = pygame.font.SysFont("consolas", 22)
    font_sub = pygame.font.SysFont("consolas", 13)

    cpu_text = font_main.render(f"{cpu_percent:.0f}%", True, cpu_color)
    surface.blit(cpu_text, (cx - cpu_text.get_width() // 2,
                            cy - cpu_text.get_height() // 2 - 15))

    cpu_label = font_sub.render("CPU", True, cpu_color)
    surface.blit(cpu_label, (cx - cpu_label.get_width() // 2,
                             cy + 5))

    if mem_percent is not None:
        mem_text = font_sub.render(f"MEM {mem_percent:.0f}%", True, mem_color)
        surface.blit(mem_text, (cx - mem_text.get_width() // 2,
                                cy + 20))

    if net_percent is not None:
        net_text = font_sub.render(f"NET {net_percent:.0f}%", True, NET_COLOR)
        surface.blit(net_text, (cx - net_text.get_width() // 2,
                                cy + 35))