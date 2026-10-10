import multer from "multer";

const storage =
  multer.memoryStorage();

const upload =
  multer({

    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter:
      (
        _req,
        file,
        callback
      ) => {

        const allowed = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ];

        if (
          !allowed.includes(
            file.mimetype
          )
        ) {

          return callback(
            new Error(
              "Format foto harus JPG, JPEG, PNG, atau WEBP."
            )
          );

        }

        callback(
          null,
          true
        );
      },

  });

export default upload;