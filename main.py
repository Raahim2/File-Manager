from flask import Flask , render_template , request , send_from_directory
import os
import functions as pdf

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads' 



code_extensions = ["py", "c", "cpp", "java", "js", "html", "css", "php", "rb", "go", "swift", "sql"]
drawing_extensions = ["png", "jpg","jpeg", "gif", "svg", "dwg","bmp", "psd", "ai", "eps", "tif", "tiff"]
text_extensions = ["txt", "doc", "pdf", "rtf", "odt", "tex", "md",  "xml", "json", "docx"]
excel_extensions = ["csv","xls", "xlsx", "xlsm", "xlsb", "xlt", "xltx", "xltm", "ods"]


# currentfile = "uploads/text/pd1.pdf"

@app.route('/' , methods=['POST','GET'])
def main():
    context = {
        'codefiles': os.listdir('uploads/code'),
        'textfiles': os.listdir('uploads/text'),
        'excelfiles': os.listdir('uploads/excel'),
        'dwgfiles': os.listdir('uploads/drawing'),
        'output': os.listdir('OUTPUT'),
    }
    global currentfile
    try:
        currentfile
    except NameError:
        currentfile = "uploads/text/pd1.pdf" 

    info = pdf.get_pdf_info(currentfile)


    return render_template('index.html' , context = context   ,info=info )
    # return render_template('index.html' , context = context  )



@app.route('/uploader' , methods=['POST','GET'])
def upload():
    context = {
        'codefiles': os.listdir('uploads/code'),
        'textfiles': os.listdir('uploads/text'),
        'excelfiles': os.listdir('uploads/excel'),
        'dwgfiles': os.listdir('uploads/drawing'),
        'output': os.listdir('OUTPUT')
    }


    messege = "Upload"
    if request.method == 'POST':
        file = request.files.get('file')


        file_ext = file.filename.split('.')[-1].lower()
        if file_ext in code_extensions:
            save_path = 'uploads/code/'
        elif file_ext in drawing_extensions:
            save_path = 'uploads/drawing/'
        elif file_ext in text_extensions:
            save_path = 'uploads/text/'
        elif file_ext in excel_extensions:
            save_path = 'uploads/excel/'

        file.save(save_path + file.filename) 

        messege = "File uploader sucessfully"
        return render_template('upload.html' , messege = messege , context=context)  
    return render_template('upload.html' , messege = messege , context = context)
    

@app.route('/pdf/<path:filename>')
def serve_pdf(filename): 
    file_ext = filename.split('.')[-1].lower()
    if filename in os.listdir('OUTPUT'):
        return send_from_directory('OUTPUT/', filename)
    
    if file_ext in code_extensions:
        save_path = 'uploads/code/'
    elif file_ext in drawing_extensions:
        save_path = 'uploads/drawing/'
    elif file_ext in text_extensions:
        save_path = 'uploads/text/'
    elif file_ext in excel_extensions:
        save_path = 'uploads/excel/'
    else :
        save_path = 'uploads/output/'

    global currentfile
    currentfile = save_path + filename

    return send_from_directory(save_path, filename)


@app.route('/process' ,  methods=['POST','GET'])
def process():
    context = {
        'codefiles': os.listdir('uploads/code'),
        'textfiles': os.listdir('uploads/text'),
        'excelfiles': os.listdir('uploads/excel'),
        'dwgfiles': os.listdir('uploads/drawing'),
        'output': os.listdir('OUTPUT'),
    }

        
    if request.method =="POST":
        task = request.form.get('task')
        filename = request.form.get('pdf')
        setname = request.form.get('setname')
        password = request.form.get('password')

        file_ext = filename.split('.')[-1].lower()
        if file_ext in code_extensions:
            save_path = 'uploads/code/'
        elif file_ext in drawing_extensions:
            save_path = 'uploads/drawing/'
        elif file_ext in text_extensions:
            save_path = 'uploads/text/'
        elif file_ext in excel_extensions:
            save_path = 'uploads/excel/'

        path = save_path+filename
        global currentfile
        currentfile = path 

        info = pdf.get_pdf_info(currentfile)
        
        if(task =="gettext"):
            text = pdf.get_text_from_pdf(path)
            file_path = os.path.join("output", f"{setname}.txt")
            with open(file_path, "w") as file:
                file.write(text)
        if(task =="lock"):
            pdf.lock_pdf(path  ,password , f"{setname}")
        if(task =="getimgs"):
            pdf.extract_image_from_pdf(path)
        if(task =="mergepdf"):
            file_list = password.split(', ')
            file_list = ['uploads/text/' + filename.strip() for filename in file_list]
            pdf.merge_pdf(file_list , setname)
  

            

        return render_template('index.html' , context = context , info = info)  
        
    return render_template('index.html' ,context=context )
    

    
    

if __name__ == "__main__":
    app.run(debug=True)