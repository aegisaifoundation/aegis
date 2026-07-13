import pygame
import psutil
import threading
import time
import grpc_server
from graphics.circular_gauge import draw_circular_gauge
from graphics.layout import WIDTH, HEIGHT, BOXES

pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("FEDERATED AI COMMAND CORE")
clock = pygame.time.Clock()

font_small = pygame.font.SysFont("consolas", 14)
font_medium = pygame.font.SysFont("consolas", 18)
font_large = pygame.font.SysFont("consolas", 28)

threading.Thread(target=grpc_server.serve, daemon=True).start()

LOG_COLORS = {
    "INFO": (0,150,255),
    "SUCCESS": (0,255,200),
    "WARNING": (255,180,0),
    "ERROR": (255,60,60),
    "SECURE": (180,0,255),
}

def panel(x,y,w,h):
    pygame.draw.rect(screen,(12,22,32),(x,y,w,h))

running=True
log_scroll=0

prev_net = psutil.net_io_counters()
prev_time = time.time()

while running:
    clock.tick(60)
    screen.fill((5,10,18))

    for event in pygame.event.get():
        if event.type==pygame.QUIT:
            running=False
        if event.type==pygame.MOUSEWHEEL:
            log_scroll+=event.y*25

    cpu=psutil.cpu_percent()
    mem=psutil.virtual_memory().percent
    net=psutil.net_io_counters()

    current_time=time.time()
    delta_time=current_time-prev_time

    upload_speed=(net.bytes_sent-prev_net.bytes_sent)/(1024*1024*delta_time)
    download_speed=(net.bytes_recv-prev_net.bytes_recv)/(1024*1024*delta_time)

    prev_net=net
    prev_time=current_time

    with grpc_server.state_lock:
        logs=list(grpc_server.server_logs)
        nodes=dict(grpc_server.node_status)
        agg_status=grpc_server.aggregation_status
        round_no=grpc_server.federated_round
        agg_time=grpc_server.aggregation_duration
        model_hash=grpc_server.model_hash
        model_size=grpc_server.model_size_mb
        model_time=grpc_server.model_last_updated
        round_history=list(grpc_server.round_history)
        model_size_history=list(grpc_server.model_size_history)
        total_rx=grpc_server.total_encrypted_rx_mb
        total_tx=grpc_server.total_encrypted_tx_mb
        round_traffic=grpc_server.round_traffic_mb
        latencies=list(grpc_server.rpc_latencies)
        max_latency=grpc_server.max_rpc_latency
        uptime=int(time.time()-grpc_server.server_start_time)

    avg_latency=sum(latencies)/len(latencies) if latencies else 0
    active_nodes=len(nodes)

    # HEADER
    header=font_large.render("FEDERATED AI COMMAND CORE",True,(0,255,200))
    screen.blit(header,(WIDTH//2-header.get_width()//2,20))

    # REACTOR
    x,y,w,h=BOXES["circle"]
    network_load = min(100, upload_speed * 10)
    draw_circular_gauge(screen,(x+200,y+170),110,cpu,mem,network_load)

    # NODE MATRIX
    x,y,w,h=BOXES["clients"]
    panel(x,y,w,h)
    screen.blit(font_medium.render("NODE STATUS MATRIX",True,(0,255,200)),(x+15,y+15))

    offset=60
    for name,data in nodes.items():
        text=f"{name} | {data['status']} | LAST: {data['last_seen']}"
        screen.blit(font_small.render(text,True,(0,255,120)),(x+15,y+offset))
        offset+=25

    # ================= NETWORK INTELLIGENCE =================
    x,y,w,h=BOXES["system"]
    panel(x,y,w,h)
    screen.blit(font_medium.render("NETWORK INTELLIGENCE",True,(0,255,200)),(x+15,y+15))

    y_offset=55
    screen.blit(font_small.render(f"Upload: {upload_speed:.2f} MB/s",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Download: {download_speed:.2f} MB/s",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Active Nodes: {active_nodes}",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Round Traffic: {round_traffic:.2f} MB",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Encrypted RX: {total_rx:.2f} MB",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Encrypted TX: {total_tx:.2f} MB",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Avg Latency: {avg_latency:.1f} ms",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Max Latency: {max_latency:.1f} ms",True,(200,200,200)),(x+15,y+y_offset)); y_offset+=20
    screen.blit(font_small.render(f"Uptime: {uptime}s",True,(200,200,200)),(x+15,y+y_offset))

    # ================= AGGREGATION CONTROL =================
    x,y,w,h=BOXES["aggregation"]
    panel(x,y,w,h)
    screen.blit(font_medium.render("AGGREGATION CONTROL",True,(0,255,200)),(x+15,y+15))
    screen.blit(font_small.render(f"ROUND: {round_no}",True,(200,200,200)),(x+15,y+55))
    screen.blit(font_small.render(f"STATUS: {agg_status}",True,(200,200,200)),(x+15,y+75))
    screen.blit(font_small.render(f"LAST MERGE: {agg_time:.2f}s",True,(200,200,200)),(x+15,y+95))

    if len(round_history)>0:
        gx=x+15; gy=y+h-35; gw=w-30; gh=6
        segment_w=gw//len(round_history)
        for i in range(len(round_history)):
            pygame.draw.rect(screen,(0,200,255),(gx+i*segment_w,gy,segment_w-2,gh))

    # ================= MODEL INTEGRITY =================
    x,y,w,h=BOXES["global"]
    panel(x,y,w,h)
    screen.blit(font_medium.render("MODEL INTEGRITY UNIT",True,(0,255,200)),(x+15,y+15))
    screen.blit(font_small.render(f"SIZE: {model_size:.2f} MB",True,(200,200,200)),(x+15,y+55))
    screen.blit(font_small.render(f"HASH: {model_hash}",True,(200,200,200)),(x+15,y+75))
    screen.blit(font_small.render(f"UPDATED: {model_time}",True,(200,200,200)),(x+15,y+95))

    if len(model_size_history)>0:
        gx=x+15; gy=y+h-35; gw=w-30; gh=6
        segment_w=gw//len(model_size_history)
        for i in range(len(model_size_history)):
            pygame.draw.rect(screen,(0,255,180),(gx+i*segment_w,gy,segment_w-2,gh))

    # ================= LOG PANEL RESTORED =================
    x,y,w,h=BOXES["log"]
    panel(x,y,w,h)
    screen.blit(font_medium.render("LIVE ACTIVITY FEED",True,(0,255,200)),(x+15,y+15))

    visible_top=y+50
    visible_bottom=y+h-20
    line_height=22
    total_height=len(logs)*line_height
    max_scroll=max(0,total_height-(visible_bottom-visible_top))
    log_scroll=max(-max_scroll,min(0,log_scroll))

    cy=visible_top+log_scroll
    for log in logs:
        if visible_top-line_height<cy<visible_bottom:
            color=LOG_COLORS.get(log["level"],(200,200,200))
            text=f"[{log['time']}] [{log['level']}] {log['message']}"
            screen.blit(font_small.render(text,True,color),(x+15,cy))
        cy+=line_height

    pygame.display.flip()

pygame.quit()