var axios = require("axios");
var cheerio = require("cheerio");
var express = require("express");
var exphbs = require("express-handlebars");
var mongoose = require("mongoose");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Handlebars
app.engine(
  "handlebars",
  exphbs({
    defaultLayout: "main"
  })
);
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true
});

// Routes

app.get("/scrape", function(req, res) {
  var uniqueArticles = 0;
  axios.get("https://www.nytimes.com/").then(function(response) {
    var $ = cheerio.load(response.data);
    $("section[data-testid='block-TopStories'] article").each(function(
      i,
      element
    ) {
      // console.log(element);
      console.log(
        $(this)
          .find("li")
          .text()
      );
      var result = {};
      if ($(this).find("li") != undefined) {
        result.link =
          "https://www.nytimes.com/" +
          $(this)
            .find("a")
            .attr("href");
        result.title = $(this)
          .find("h2")
          .text();
        result.summary = $(this)
          .find("li")
          .text();
        console.log(result);
        db.Article.find({
          link: result.link,
          title: result.title,
          summary: result.summary
        })
          .then(function(dbArticle) {
            console.log(dbArticle);
            if (dbArticle.length === 0) {
              uniqueArticles++;

              db.Article.create(result)
                .then(function(newArticle) {
                  console.log(newArticle);
                })
                .catch(function(err) {
                  console.log(err);
                });
            }
          })
          .catch(function(err) {
            console.log(err);
          });
      }
    });
    res.send("Scrape complete!");
  });
  if (uniqueArticles > 0) {
    res.json({
      message: "There are " + uniqueArticles.toString() + " new articles."
    });
  }
});

//Renders all unsaved articles
app.get("/", function(req, res) {
  db.Article.find({ saved: false }).then(function(dbArticles) {
    res.render("index", {
      articles: dbArticles,
      summary: dbArticles.summary
    });
  });
});

//Renders all saved articles
app.get("/api/headlines?saved=true", function(req, res) {
  db.Article.find({ saved: true }).then(function(dbArticles) {
    res.render("index", {
      articles: dbArticles,
      summary: dbArticles.summary
    });
  });
});

//Renders all saved articles onto Saved page
app.get("/saved", function(req, res) {
  db.Article.find({ saved: true }).then(function(dbArticles) {
    res.render("saved", {
      articles: dbArticles,
      saved: dbArticles.saved
    });
  });
});

// Set saved to true on given Article with Id
app.put("/articles/:id", function(req, res) {
  console.log(req.body);
  var articleID = req.params.id;
  console.log(articleID);
  db.Article.updateOne({ _id: req.params.id }, { saved: true }).then(function(
    res
  ) {
    console.log(res);
  });
});

// app.put("/api/headlines/:id", function(req, res) {
//   db.Article.findOneAndUpdate(
//     { _id: req.params.id },
//     { saved: true },
//     { new: true }
//   )
//     .then(function(dbArticle) {
//       // If we were able to successfully update an Article, send it back to the client
//       res.json(dbArticle);
//     })
//     .catch(function(err) {
//       // If an error occurred, send it to the client
//       res.json(err);
//     });
// });

//route to delete a single article
app.delete("/api/headlines/:id", function(req, res) {
  db.Article.remove({ _id: req.params.id }).then(function(error, response) {
    if (error) {
      console.log(error);
    } else {
      console.log(response);
    }
  });

  db.Note.remove({ _headlineId: req.params.id }).then(function(
    error,
    response
  ) {
    // Log any errors to the console
    if (error) {
      console.log(error);
    } else {
      console.log(response);
    }
  });
});

//Lets user clear all saved articles
app.delete("/articles", function(req, res) {
  db.Article.deleteMany({ saved: true })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});

//Lets user clear all saved articles
app.delete("/clear", function(req, res) {
  db.Article.deleteMany({ saved: false })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});

// app.get("/api/notes/:id", function(req, res) {
//   db.Note.find({ _headlineId: req.params.id })
//     .then(function(dbArticle) {
//       res.json(dbArticle);
//     })
//     .catch(function(err) {
//       res.json(err);
//     });
// });

// app.get("/api/headlines/saved", function(req, res) {
//   db.Article.find({ saved: true })
//     .then(function(dbArticle) {
//       res.json(dbArticle);
//     })
//     .catch(function(err) {
//       res.json(err);
//     });
// });

// Get a specific Article by id, populate it with its note(s)
app.get("/notes", function(req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("notes")
    .then(function(dbArticle) {
      res.render("note", {
        article: dbArticle
      });
    })
    .catch(function(err) {
      res.json(err);
    });
});

// Save or update an Article's associated Note
app.post("/articles/:id", function(req, res) {
  db.Note.create(req.body)
    .then(function(dbNote) {
      // { new: true } tells query to return the updated Article, not the original
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { notes: dbNote._id } },
        { new: true }
      );
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});
// Delete note
app.delete("/notes/:id", function(req, res) {
  db.Note.deleteOne({ _id: req.params.id })
    .then(function(dbNote) {
      res.json(dbNote);
    })
    .catch(function(err) {
      res.json(err);
    });
});

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
