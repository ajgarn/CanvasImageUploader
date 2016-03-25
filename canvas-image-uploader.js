/**
 * Resize and rotate images by EXIF orientation on the client side during upload. This uses
 * the HTML Canvas element and HTML5 FileReader.
 *
 * This class requires the Javascript file from https://github.com/jseidelin/exif-js
 *
 * See the GitHub repo for examples: https://github.com/ajgarn/CanvasImageUploader.
 *
 * @class CanvasImageUploader
 * @author ajgarn
 * @see https://github.com/ajgarn/CanvasImageUploader
 */
var EXIF = EXIF || require('exif-js');

function CanvasImageUploader(options) {
    options = options || {};
    if (typeof options.maxSize === 'undefined') options.maxSize = 1500;
    if (typeof options.jpegQuality === 'undefined') options.jpegQuality = 0.7;

    var image;          // Image object (<img>)
    var imageData;      // Image from canvas as byte array

    /**
     * Set up operations and degrees to rotate for each EXIF orientation (index).
     */
    var ExifOrientations = [
        { op: 'none', degrees: 0 },
        { op: 'flip-x', degrees: 0 },
        { op: 'none', degrees: 180 },
        { op: 'flip-y', degrees: 0 },
        { op: 'flip-x', degrees: 90 },
        { op: 'none', degrees: 90 },
        { op: 'flip-x', degrees: -90 },
        { op: 'none', degrees: -90 }
    ];

    /**
     * Converts a base64 string to byte array.
     */
    function base64toBlob(base64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(base64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);
            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            var byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, {type: contentType});
    }

    /**
     * Determines whether we need to change width/height dimensions or not.
     */
    function isRotated(orientation) {
        return !! ~[5,6,7,8].indexOf(orientation);
    }

    function flipContext(ctx, canvas, x, y){
        ctx.translate(x ? canvas.width : 0, y ? canvas.height : 0);
        ctx.scale(x ? -1 : 1, y ? -1 : 1);
    }

    function rotateContext(ctx, attr){
        var x = attr.x || 0;
        var y = attr.y || 0;

        if (attr.degrees) {
            attr.radians = attr.degrees * (Math.PI / 180);
        }

        ctx.translate(x, y);
        ctx.rotate(attr.radians);
        ctx.translate(-x, -y);
    }

    function calculateSize(image, maxSize) {
        var size = { width: image.width, height: image.height };
        if (image.width > maxSize || image.height > maxSize) {
            var ratio = image.width / image.height;
            if (image.width >= image.height) {
                size.width = maxSize;
                size.height = maxSize / ratio;
            } else {
                size.height = maxSize;
                size.width = maxSize * ratio;
            }
        }
        return size;
    }

    function setDimensions($canvas, size, orientation) {
        if (isRotated(orientation)) {
            $canvas.attr('height', size.width);
            $canvas.attr('width', size.height);
        } else {
            $canvas.attr('width', size.width);
            $canvas.attr('height', size.height);
        }
    }

    function drawOnCanvas(image, $canvas, orientation, maxSize) {
        var canvas = $canvas[0];
        var ctx = canvas.getContext('2d');

        var exifOrientation = ExifOrientations[orientation - 1];
        var size = calculateSize(image, maxSize);
        setDimensions($canvas, size, orientation);

        // Clear canvas
        ctx.clearRect(0, 0, $canvas.width(), $canvas.height());

        // Flip vertically or horizontally
        if ('flip-x' == exifOrientation.op) flipContext(ctx, canvas, true, false);
        if ('flip-y' == exifOrientation.op) flipContext(ctx, canvas, false, true);

        // Rotate image
        if (exifOrientation.degrees) {
            rotateContext(ctx, {
                degrees: exifOrientation.degrees,
                x: $canvas.width() / 2,
                y: $canvas.height() / 2
            });

            if (isRotated(orientation)) {
                var diff = $canvas.width() - $canvas.height();
                ctx.translate(diff / 2, -diff / 2);
            }
        }

        ctx.drawImage(image, 0, 0, image.width, image.height,   // Source rectangle
            0, 0, size.width, size.height);                     // Destination rectangle
    }

    function readImageToCanvasOnLoad(image, $canvas, callback) {
        getExifOrientation(image, function (orientation) {
            drawOnCanvas(image, $canvas, orientation, options.maxSize);
            if (callback)
                callback();
            else
                console.warn('No callback for readImageToCanvas');
        });
    }

    function getExifOrientation(image, callback) {
        if (!image) {
            console.warn('No image');
            return;
        }

        EXIF.getData(image, function () {
            var orientation = EXIF.getTag(image, 'Orientation') || 1;
            if (callback)
                callback(orientation);
            else
                console.warn('No callback for getExifOrientation()');
        });
    }

    return {
        /**
         * Run to initialize CanvasImageUploader.
         */
        newImage: function() {
            imageData = null;
            image = new Image();
        },

        /**
         * Returns the image data if any file has been read.
         * @returns {Blob|null}
         */
        getImageData: function() {
            return imageData;
        },

        /**
         * Draw an image (<img>) or contents of a canvas to another canvas. The destination
         * canvas is resized properly.
         * @param source The image or source canvas to draw on a new canvas.
         * @param $destination The destination canvas to draw onto.
         * @param maxSize Maximum width or height of the destination canvas.
         */
        copyToCanvas: function (source, $destination, maxSize) {
            var size = calculateSize(source, maxSize);
            setDimensions($destination, size, 1);
            var destCtx = $destination[0].getContext('2d');
            destCtx.drawImage(source, 0, 0, source.width, source.height,
                0, 0, size.width, size.height);
        },

        /**
         * Draw an image from a file on a canvas.
         * @param file The uploaded file.
         * @param $canvas The canvas (jQuery) object to draw on.
         * @param callback Function that is called when the operation has finished.
         */
        readImageToCanvas: function(file, $canvas, callback) {
            this.newImage();
            if (!file)
                return;

            var reader = new FileReader();
            reader.onload = function (fileReaderEvent) {
                image.onload = function () { readImageToCanvasOnLoad(this, $canvas, callback); };
                image.src = fileReaderEvent.target.result;      // The URL from FileReader

            };
            reader.readAsDataURL(file);
        },

        /**
         * Read the canvas data and save it as a binary byte array to image data variable.
         * Get this data using the method getImageData().
         * @param canvas
         */
        saveCanvasToImageData: function(canvas) {
            var base64 = canvas.toDataURL('image/jpeg', options.jpegQuality)
                .replace(/^data:image\/(png|jpeg|jpg|gif);base64,/, '');
            imageData = base64toBlob(base64, 'image/jpeg');       // Byte array
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = CanvasImageUploader;
}