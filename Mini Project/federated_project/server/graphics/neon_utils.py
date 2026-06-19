import pygame

NEON = (0, 255, 170)
DARK = (0, 30, 25)

def neon_rect(surface, x, y, w, h):
    pygame.draw.rect(surface, DARK, (x, y, w, h))

def neon_text(surface, text, font, x, y):
    glow = font.render(text, True, (0, 120, 80))
    surface.blit(glow, (x+1, y+1))
    txt = font.render(text, True, NEON)
    surface.blit(txt, (x, y))