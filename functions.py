from PyPDF2 import PdfReader , PdfWriter 
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import os

def get_text_from_pdf(pdf_path):
    pdf = PdfReader(pdf_path)
    text = ""
    for i in range(len(pdf.pages)):    
        page = pdf.pages[i]
        text = text + page.extract_text()
    return text

def lock_pdf(pdf_path, password, file):
    
    output_folder = "OUTPUT"
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(password)
    
    with open(os.path.join(output_folder, f"{file}.pdf"), "wb") as f:
        writer.write(f)

def unlock_pdf(pdf_path , password):
    reader = PdfReader(pdf_path)
    writer = PdfWriter()

    if reader.is_encrypted:
        reader.decrypt(password)

    for page in reader.pages:
        writer.add_page(page)

    with open("decrypted-pdf.pdf", "wb") as f:
        writer.write(f)

def extract_image_from_pdf(pdf_path):
    pdf = PdfReader(pdf_path)
    output_folder = "OUTPUT" 
    os.makedirs(output_folder, exist_ok=True)  
    
    for i in range(len(pdf.pages)):
        page = pdf.pages[i]
        count = 0
        for image in page.images:
            image_path = os.path.join(output_folder, str(count) + image.name)  
            with open(image_path, "wb") as fp:
                fp.write(image.data)
            count += 1

def merge_pdf(files_list, filename):
    merger = PdfWriter()

    for pdf in files_list:
        merger.append(pdf)

    output_folder = "OUTPUT"
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    with open(os.path.join(output_folder, f"{filename}.pdf"), "wb") as output_pdf:
        merger.write(output_pdf)

    merger.close()

def create_pdf(message, heading , file_name='output.pdf'):
    c = canvas.Canvas(file_name, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100,750 , heading)
    c.setFont("Helvetica", 12)
    c.drawString(100, 700, message)
    c.save()

def get_pdf_info(pdf_path):
    if not pdf_path.lower().endswith('.pdf'):
        return {"Status" : "Not Found"}
    
    pdf_info = {}
    with open(pdf_path, 'rb') as file:
        pdf_reader = PdfReader(file)
        metadata = pdf_reader.metadata
        if metadata:
            pdf_info.update(metadata)
        else:
            pdf_info["No metadata found"] = None
    return pdf_info



