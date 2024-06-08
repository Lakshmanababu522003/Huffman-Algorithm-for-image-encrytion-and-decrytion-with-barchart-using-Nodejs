const express = require('express');
const multer = require('multer');
const imageToBase64 = require('image-to-base64');
const decode = require('node-base64-image').decode;
const bodyparser = require('body-parser');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const app = express();

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/uploads");
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

var upload = multer({ storage: storage }).single('file');

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use('/assets', express.static('assets'));
app.use(express.static('public/uploads'));
app.set('view engine', 'ejs');

const PORT = 5000;

app.get('/', (req, res) => {
    res.render('index', { originalSizeKB: null, compressedSizeKB: null, compressionRatio: null, decompressedSizeKB: null, decompressionRatio: null });
});

const getFileSizeKB = (filePath) => {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    return fileSizeInBytes / 1024;
};

app.post('/encode', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err); // Send an error response
        } else {
            console.log(req.file.path);
            const output = Date.now() + "encode.text";
            imageToBase64(req.file.path)
                .then((response) => {
                    console.log(response);
                    fs.writeFileSync(output, response);
                    res.download(output, () => {
                        console.log('file is downloaded');
                    });
                })
                .catch((error) => {
                    console.log(error);
                    return res.status(500).send(error); // Send an error response
                });
        }
    });
});

app.post('/decode', async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err); // Send an error response
        } else {
            console.log(req.file.path);
            const output = Date.now() + "Decoded_Image.jpg";
            const encodefile = fs.readFileSync(req.file.path, "utf-8");
            await decode(encodefile, { fname: output, ext: "jpg" });
            res.download(output, () => {
                console.log('file downloaded');
            });
        }
    });
});

app.post('/compress', async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err); // Send an error response
        } else {
            console.log(req.file.path);
            const inputImagePath = req.file.path;
            const outputImagePath = Date.now() + "-compressed.jpg";
            const originalSizeKB = getFileSizeKB(inputImagePath);
            await sharp(inputImagePath).toFile(outputImagePath);
            const compressedSizeKB = getFileSizeKB(outputImagePath);
            const compressionRatio = originalSizeKB / compressedSizeKB;


            // Render the index page with data and the function to serve download
            res.render('index', {
                originalSizeKB,
                compressedSizeKB,
                compressionRatio,
                inputImagePath,
                outputImagePath,
                decompressedSizeKB: null,
                decompressionRatio: null,
                 // Convert function to string
            });
        }
    });
});




app.post('/decompress', async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            console.log(err);
            return res.status(500).send(err); // Send an error response
        } else {
            console.log(req.file.path); // Check the uploaded file path
            const output = Date.now() + "-Decompressed_Image.jpg"; // Corrected output filename
            const encodefile = fs.readFileSync(req.file.path, "utf-8");
            await decode(encodefile, { fname: output, ext: "jpg" });
            
            // Debugging: Log the output filename
            console.log("Output filename:", output);
            
            // Check if the decompressed file exists
            if (fs.existsSync(output)) {
                const inputImagePath = req.file.path;
                const originalSizeKB = getFileSizeKB(inputImagePath); // Add this line
                const decompressedSizeKB = getFileSizeKB(output);
                const decompressionRatio = decompressedSizeKB / originalSizeKB;
                res.render('index', {
                    originalSizeKB,
                    compressedSizeKB: null,
                    compressionRatio: null,
                    inputImagePath,
                    outputImagePath: null,
                    decompressedSizeKB,
                    decompressionRatio
                });
            } else {
                // Log an error if the decompressed file doesn't exist
                console.error("Decompressed file not found:", output);
                return res.status(500).send("Decompressed file not found");
            }
        }
    });
});



app.listen(PORT, (err) => {
    if(err){
        console.log(err);
    }
    else{
    console.log('Server is running on port ' + PORT);
}
});
