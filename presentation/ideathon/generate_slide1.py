import os
import shutil
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# ---------------------------------------------------------
# CONSTANTS & COLOR PALETTE (Matching Visual Identity)
# ---------------------------------------------------------
COLOR_BG = RGBColor(10, 11, 12)          # Very Dark Charcoal/Obsidian (#0A0B0C)
COLOR_CARD = RGBColor(18, 20, 24)        # Dark Glass/Card Background (#121418)
COLOR_CARD_BORDER = RGBColor(40, 44, 52) # Card Border Accent (#282C34)
COLOR_ORANGE = RGBColor(198, 106, 43)    # Signature Copper/Amber Accent (#C66A2B)
COLOR_WHITE = RGBColor(245, 245, 247)    # Crisp Bright White Text (#F5F5F7)
COLOR_GRAY = RGBColor(160, 160, 165)     # Muted Subtitle Gray (#A0A0A5)
COLOR_DIVIDER = RGBColor(45, 48, 55)     # Subtle Line Divider (#2D3037)

BG_IMAGE_PATH = r"C:\Users\gokul_oae3l3i\.gemini\antigravity-ide\brain\6e722032-80f4-452a-848e-93df621adeec\aegis_slide1_bg_1788524773595.png"

def draw_rectangle(slide, x, y, w, h, fill_color, line_color=None, line_width_pt=1):
    rect = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    rect.fill.solid()
    rect.fill.fore_color.rgb = fill_color
    if line_color:
        rect.line.color.rgb = line_color
        rect.line.width = Pt(line_width_pt)
    else:
        rect.line.fill.background()
    return rect

def draw_rounded_card(slide, x, y, w, h, fill_color, line_color=None, line_width_pt=1):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    card.fill.solid()
    card.fill.fore_color.rgb = fill_color
    if line_color:
        card.line.color.rgb = line_color
        card.line.width = Pt(line_width_pt)
    else:
        card.line.fill.background()
    return card

def build_slide_1(output_pptx_paths):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank_layout)

    # 1. Base dark background fill
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = COLOR_BG

    # 2. Add cinematic futuristic background image (full bleed widescreen)
    if os.path.exists(BG_IMAGE_PATH):
        slide.shapes.add_picture(BG_IMAGE_PATH, Inches(0), Inches(0), Inches(13.333), Inches(7.5))

    # 3. Add subtle dark gradient overlay card to ensure crystal clear typography contrast
    overlay = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(0), Inches(13.333), Inches(7.5))
    overlay.fill.solid()
    overlay.fill.fore_color.rgb = COLOR_BG
    # Set transparency if possible via XML, or subtle dark box layout
    # In pptx, we can set fill transparency using element XML
    try:
        fill_elem = overlay.fill._element
        solid_fill = fill_elem.find('{http://schemas.openxmlformats.org/drawingml/2006/main}solidFill')
        if solid_fill is not None:
            srgb = solid_fill.find('{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr')
            if srgb is not None:
                alpha = srgb.makeelement('{http://schemas.openxmlformats.org/drawingml/2006/main}alpha', {'val': '65000'}) # 65% opacity
                srgb.append(alpha)
    except Exception as e:
        print("Overlay transparency note:", e)

    overlay.line.fill.background()

    # 4. Left vertical signature copper accent line
    draw_rectangle(slide, 0.35, 0.0, 0.04, 7.5, COLOR_ORANGE)

    # 5. Top Header Tag / Indicator Badge
    tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.55), Inches(6.0), Inches(0.4))
    tf_tag = tag_box.text_frame
    tf_tag.word_wrap = True
    tf_tag.margin_left = tf_tag.margin_right = tf_tag.margin_top = tf_tag.margin_bottom = 0
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = "01  |  AEGIS INFRASTRUCTURE"
    p_tag.font.name = "Inter"
    p_tag.font.size = Pt(13)
    p_tag.font.bold = True
    p_tag.font.color.rgb = COLOR_ORANGE

    # 6. Dominant Main Title Box: AEGIS
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.15), Inches(11.5), Inches(1.6))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_right = tf_title.margin_top = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = "AEGIS"
    p_title.font.name = "Sora"
    p_title.font.size = Pt(96)
    p_title.font.bold = True
    p_title.font.color.rgb = COLOR_WHITE

    # 7. Subtitle Box: Autonomous Emergent General Intelligence System
    sub_box = slide.shapes.add_textbox(Inches(0.85), Inches(2.75), Inches(11.5), Inches(0.6))
    tf_sub = sub_box.text_frame
    tf_sub.word_wrap = True
    tf_sub.margin_left = tf_sub.margin_right = tf_sub.margin_top = tf_sub.margin_bottom = 0
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = "Autonomous Emergent General Intelligence System"
    p_sub.font.name = "Inter"
    p_sub.font.size = Pt(20)
    p_sub.font.bold = True
    p_sub.font.color.rgb = COLOR_ORANGE

    # 8. Accent Divider Line under subtitle
    draw_rectangle(slide, 0.85, 3.5, 3.8, 0.02, COLOR_ORANGE)

    # 9. Main Hook Card (Futuristic Glass Card framing the question)
    card_w, card_h = 11.7, 2.7
    card_x, card_y = 0.85, 4.0
    
    draw_rounded_card(
        slide, 
        card_x, card_y, card_w, card_h, 
        COLOR_CARD, 
        line_color=COLOR_CARD_BORDER, 
        line_width_pt=1.5
    )

    # Card accent line (left top inside card)
    draw_rectangle(slide, card_x + 0.3, card_y + 0.4, 0.04, 1.9, COLOR_ORANGE)

    # Question Label & Main Hook Text Box inside Card
    hook_box = slide.shapes.add_textbox(Inches(card_x + 0.55), Inches(card_y + 0.35), Inches(10.8), Inches(2.0))
    tf_hook = hook_box.text_frame
    tf_hook.word_wrap = True
    tf_hook.margin_left = tf_hook.margin_right = tf_hook.margin_top = tf_hook.margin_bottom = 0

    # Paragraph 1: Small Tag
    p_label = tf_hook.paragraphs[0]
    p_label.text = "THE CORE QUESTION"
    p_label.font.name = "Inter"
    p_label.font.size = Pt(11)
    p_label.font.bold = True
    p_label.font.color.rgb = COLOR_ORANGE
    p_label.space_after = Pt(10)

    # Paragraph 2: Large Visual Hook
    p_hook = tf_hook.add_paragraph()
    p_hook.text = "WHO WILL CREATE THE INTELLIGENCE\nOF TOMORROW?"
    p_hook.font.name = "Sora"
    p_hook.font.size = Pt(40)
    p_hook.font.bold = True
    p_hook.font.color.rgb = COLOR_WHITE
    p_hook.line_spacing = 1.1

    # Save to all requested file paths
    for path in output_pptx_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        prs.save(path)
        print(f"Saved PPTX to: {path}")

def convert_pptx_to_png(pptx_path, output_png_path):
    try:
        import win32com.client
        ppt_app = win32com.client.Dispatch("PowerPoint.Application")
        # ppt_app.Visible = True # PowerPoint must be visible or headless
        abs_pptx = os.path.abspath(pptx_path)
        abs_png = os.path.abspath(output_png_path)
        presentation = ppt_app.Presentations.Open(abs_pptx, WithWindow=False)
        slide = presentation.Slides(1)
        slide.Export(abs_png, "PNG")
        presentation.Close()
        ppt_app.Quit()
        print(f"Exported slide 1 preview PNG to: {abs_png}")
        return True
    except Exception as e:
        print(f"PNG Export Note: {e}")
        return False

if __name__ == "__main__":
    out_paths = [
        r"c:\aegis\presentation\ideathon\presentation_slide1.pptx",
        r"c:\aegis\presentation\ideathon\slide1.pptx",
        r"c:\aegis\apps\presentation\ideathon\presentation_slide1.pptx"
    ]
    build_slide_1(out_paths)
    preview_png = r"c:\aegis\presentation\ideathon\slide1_preview.png"
    convert_pptx_to_png(out_paths[0], preview_png)
