/* global bootbox */
$(document).ready(function() {
  // initPage();
  // Getting a reference to the article container div we will be rendering all articles inside of
  var articleContainer = $(".article-container");
  // Adding event listeners for dynamically generated buttons for deleting articles,
  // pulling up article notes, saving article notes, and deleting article notes
  $(document).on("click", ".btn.delete", handleArticleDelete);
  $(document).on("click", ".btn.add-note", addNote);
  $(document).on("click", ".btn.delete-note", deleteNote);
  $(document).on("click", ".btn.clear", deleteSavedArticles);

  function initPage() {
    // Empty the article container, run an AJAX request for any saved headlines
    $.get("/api/headlines?saved=true").then(function(data) {
      articleContainer.empty();
      // If we have headlines, render them to the page
      if (data && data.length) {
        renderArticles(data);
      }
    });
  }

  // Delete saved articles
  function deleteSavedArticles() {
    $.ajax({
      method: "DELETE",
      url: "/articles"
    }).then(function() {
      location.reload();
    });
  }

  function renderArticles(articles) {
    // This function handles appending HTML containing our article data to the page
    // We are passed an array of JSON containing all available articles in our database
    var articleCards = [];
    // We pass each article JSON object to the createCard function which returns a bootstrap
    // card with our article data inside
    for (var i = 0; i < articles.length; i++) {
      articleCards.push(createCard(articles[i]));
    }
    // Once we have all of the HTML for the articles stored in our articleCards array,
    // append them to the articleCards container
    articleContainer.append(articleCards);
  }

  function createCard(article) {
    // This function takes in a single JSON object for an article/headline
    // It constructs a jQuery element containing all of the formatted HTML for the
    // article card
    var card = $("<div class='card'>");
    var cardHeader = $("<div class='card-header'>").append(
      $("<h3>").append(
        $("<a class='article-link' target='_blank' rel='noopener noreferrer'>")
          .attr("href", article.url)
          .text(article.headline),
        $("<a class='btn btn-danger delete'>Delete From Saved</a>"),
        $("<a class='btn btn-info notes'>Article Notes</a>")
      )
    );

    var cardBody = $("<div class='card-body'>").text(article.summary);

    card.append(cardHeader, cardBody);

    // We attach the article's id to the jQuery element
    // We will use this when trying to figure out which article the user wants to remove or open notes for
    card.data("_id", article._id);
    // We return the constructed card jQuery element
    return card;
  }

  //Deletes a single article
  function handleArticleDelete() {
    var articleToDelete = $(this)
      .parents(".card")
      .data();

    // Remove card from page
    $(this)
      .parents(".card")
      .remove();
    // Using a delete method here just to be semantic since we are deleting an article/headline
    $.ajax({
      method: "DELETE",
      url: "/api/headlines/" + articleToDelete._id
    }).then(function(data) {
      // If this works out, run initPage again which will re-render our list of saved articles
      if (data.ok) {
        initPage();
      }
    });
  }
});

// Add note to article
function addNote(event) {
  event.preventDefault();
  let thisId = $(this).attr("data-id");
  let note = {
    body: $("#body").val()
  };

  $.ajax({
    method: "POST",
    url: "/articles/" + thisId,
    data: note
  }).then(function() {
    location.reload();
  });
}

// Delete note
function deleteNote() {
  let thisCard = $(this).parents(".card");
  let thisId = $(this).attr("data-id");
  $.ajax({
    method: "DELETE",
    url: "/notes/" + thisId
  }).then(function() {
    thisCard.remove();
  });
}
