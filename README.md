# CanvasImageUploader
Resize and rotate images by EXIF orientation on the client side during upload. This uses the HTML Canvas element and HTML5 FileReader.

## Use
Require from npm: `npm install canvas-image-uploader --save`

Or, if you just want to include the Javascript file in your HTML, make sure to also include [https://github.com/jseidelin/exif-js](https://github.com/jseidelin/exif-js), before CanvasImageUploader.
    
    <script src="exif-js/exif.js"></script>
    <script src="canvas-image-uploader.js"></script>

### Basic file upload
Upload image to canvas via file input.

    <input type="file" name="file" id="file">

Javascript:

    var uploader = new CanvasImageUploader({
        maxSize: 1500,
        jpegQuality: 0.7
    });
    
    $('#file').bind('change', function onImageChanged(e) {
        var files = e.target.files || e.dataTransfer.files;
        if (files) {
            file = files[0];
            var $canvas = $('<canvas>');
            uploader.readImageToCanvas(file, $canvas, function () {
                uploader.saveCanvasToImageData($canvas[0]);
            });
        }
    });
    
    // Upload the file data
    function onFormSubmit() {
        $.ajax({
            type: 'POST',
            url: 'http://...',
            data: uploader.getImageData(),
            beforeSend: function (request) {
                request.setRequestHeader("Content-Type", ".jpg");
            },
            processData: false,
            success: function (result) {
            },
            error: function (error) {
            }
        });
    }

### Show a preview of the image
Add a preview canvas to your HTML.

    <canvas id="preview-canvas" height="0" width="0"></canvas>

Javascript:

    uploader.readImageToCanvas(file, $canvas, function () {
        var canvas = $canvas[0];
        // Render the preview from your original canvas...
        uploader.copyToCanvas(canvas, $('#preview-canvas'), MAX_PREVIEW_SIZE);
        uploader.saveCanvasToImageData(canvas);
    });
