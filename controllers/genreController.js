const Genre = require("../models/genre");
const Book = require("../models/book");
const { body, validationResult } = require("express-validator");

// Display list of all Genre.
exports.genre_list = async (req, res, next) => {
  const allGenres = await Genre.find().sort({ name: 1 }).exec();
  res.render("genre_list", { title: "Genre List", genre_list: allGenres });
  
};

// Display detail page for a specific Genre.
exports.genre_detail = async (req, res, next) => {
  // Get details of genre and all associated books (in parallel)
  const [genre, booksInGenre] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title summary").exec(),
  ]);
  if (genre === null) {
    // No results.
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }

  res.render("genre_detail", {
    title: "Genre Detail",
    genre,
    genre_books: booksInGenre,
  });
};

// Display Genre create form on GET.
exports.genre_create_get = (req, res, next) => {
  res.render("genre_form", { title: "Create Genre" });
};

// Handle Genre create on POST.
exports.genre_create_post = [
  // Validate and sanitize the name field.
  body("name", "Genre name must contain at least 3 characters")
    .trim()
    .isLength({ min: 3 })
    .escape(),

  // Process request after validation and sanitization.
  async (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a genre object with escaped and trimmed data.
    const genre = new Genre({ name: req.body.name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("genre_form", {
        title: "Create Genre",
        genre,
        errors: errors.array(),
      });
      return;
    }

    // Data from form is valid.
    // Check if Genre with same name already exists.
    const genreExists = await Genre.findOne({ name: req.body.name })
      .collation({ locale: "en", strength: 2 })
      .exec();
    if (genreExists) {
      // Genre exists, redirect to its detail page.
      res.redirect(genreExists.url);
      return;
    }

    // New genre. Save and redirect to its detail page.
    await genre.save();
    res.redirect(genre.url);
  },
];

// Display Genre delete form on GET.
exports.genre_delete_get = async (req, res, next) => {
  const [genre, genre_books] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title author").populate("author").exec(),
  ]);

  if (genre === null) {
    res.redirect("/catalog/genres");
    return;
  }

  res.render("genre_delete", {
    title: "Delete Genre",
    genre,
    genre_books,
  });
};

// Handle Genre delete on POST.
exports.genre_delete_post = async (req, res, next) => {
  const [genre, genre_books] = await Promise.all([
    Genre.findById(req.params.id).exec(),
    Book.find({ genre: req.params.id }, "title author").exec(),
  ]);

  if (genre_books.length > 0) {
    // Genre in use. Re-render like GET.
    res.render("genre_delete", {
      title: "Delete Genre",
      genre,
      genre_books,
    });
    return;
  }

  await Genre.findByIdAndDelete(req.body.genreid);
  res.redirect("/catalog/genres");
};


// GET: mostrar formulario de actualización
exports.genre_update_get = async (req, res, next) => {
  const genre = await Genre.findById(req.params.id).exec();

  if (genre == null) {
    const err = new Error("Genre not found");
    err.status = 404;
    return next(err);
  }

  res.render("genre_form", { title: "Update Genre", genre });
};

// POST: procesar actualización
exports.genre_update_post = [
  body("name", "Genre name must be between 3 and 100 characters.")
    .trim()
    .isLength({ min: 3, max: 100 })
    .escape(),

  async (req, res, next) => {
    const errors = validationResult(req);

    const genre = new Genre({
      name: req.body.name,
      _id: req.params.id, // ¡Importante para no crear uno nuevo!
    });

    if (!errors.isEmpty()) {
      return res.render("genre_form", {
        title: "Update Genre",
        genre,
        errors: errors.array(),
      });
    }

    const updated = await Genre.findByIdAndUpdate(req.params.id, genre, {});
    res.redirect(updated.url);
  },
];
