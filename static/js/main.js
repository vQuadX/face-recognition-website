if (typeof jQuery === "undefined") {
    throw new Error("jQuery is required");
}

$.FaceRecognizer = {};


$.FaceRecognizer.image = {
    init: function (container) {
        this.container = container;
    },
    load: function (canvas, src, callback = null) {
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = src;
        img.addEventListener('load', function () {
            const imgWidth = this.naturalWidth;
            const imgHeight = this.naturalHeight;

            const maxWidth = canvas.width;
            const maxHeight = canvas.height;

            let ratio = 1;
            let x = 0, y = 0;
            if (imgWidth > maxWidth) {
                ratio = maxWidth / imgWidth;
            }
            if (imgHeight > maxHeight) {
                ratio = Math.min(maxHeight / imgHeight, ratio);
            }

            const resizedImgWidth = imgWidth * ratio;
            const resizedImgHeight = imgHeight * ratio;

            if (resizedImgWidth < maxWidth) {
                x = (maxWidth - resizedImgWidth) / 2
            }

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#cc0099';
            ctx.fillStyle = "#e2e3e5";

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(this, x, y, resizedImgWidth, resizedImgHeight);

            if (typeof callback === "function") {
                let offset = {x: x, y: y};
                callback(src, ratio, offset, ctx)
            }
        });
    },
    openFromURL: function (side = null, callback = null) {
        const canvas = this.container.find(side ? `.face-canvas--${side}` : '.face-canvas').get(0);
        let src = this.container.find(side ? `.image-url--${side}` : '.image-url').val();
        if (!$.FaceRecognizer.utils.urlRegexp.test(src)) {
            return;
        }
        this.load(canvas, src, callback);
    },
    openFromFile: function (file, side = null, callback = null) {
        const canvas = this.container.find(side ? `.face-canvas--${side}` : '.face-canvas').get(0);
        let src = URL.createObjectURL(file);
        this.load(canvas, src, callback);
        // URL.revokeObjectURL(src);
    },
    drawFaceRectangle: function (ctx, rectangle, strokeStyle = '#cc0099') {
        ({x, y, width, height} = rectangle);
        let tempStrokeStyle = ctx.strokeStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.strokeRect(x, y, width, height);
        ctx.strokeStyle = tempStrokeStyle;
    },
    drawFaceRectangles: function (ctx, rectangles, strokeStyle = '#cc0099') {
        let tempStrokeStyle = ctx.strokeStyle;
        ctx.strokeStyle = strokeStyle;
        for (let i = 0; i < rectangles.length; i++) {
            ({x, y, width, height} = rectangles[i]);
            ctx.strokeRect(x, y, width, height);
        }
        ctx.strokeStyle = tempStrokeStyle;
    },
};

$.FaceRecognizer.utils = {
    urlRegexp: new RegExp('^https?://', 'i'),
    scaleRectangles: function (rectangles, ratio, offset) {
        return rectangles.map(r => {
            return {
                x: r.x * ratio + offset.x,
                y: r.y * ratio + offset.y,
                width: r.width * ratio,
                height: r.height * ratio
            }
        });
    },
    collides: function (point, square) {
        return point.x >= square.x && point.x <= (square.x + square.width) &&
            point.y >= square.y && point.y <= (square.y + square.height);
    }

};