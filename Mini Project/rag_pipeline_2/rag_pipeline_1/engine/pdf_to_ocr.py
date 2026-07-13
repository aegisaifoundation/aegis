from pdf2image import convert_from_path
import pytesseract
from PIL import Image

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def ocr_pdf(pdf_path):
    pages = convert_from_path(pdf_path)
    full_text = ""

    for page in pages:
        text = pytesseract.image_to_string(page)
        full_text += text + "\n"

    return full_text	

if __name__ == "__main__":
	print(ocr_pdf(r"C:\projects\Mini Project\rag_pipeline_2\rag_pipeline_1\documents\report.pdf"))
