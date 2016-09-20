cbus.ui = {};

cbus.ui.display = function(thing, data) {
    switch (thing) {
        case "feeds":
            $(".filters_feeds--subscribed").html("");
            cbus.data.feeds.forEach(function(feed, index) {
                $(".filters_feeds--subscribed").append(cbus.data.makeFeedElem(feed, index));
            });
            break;
        case "episodes":
            $(".list--episodes").html("");

            for (var i = 0; i < Math.min(112, cbus.data.episodes.length); i++) {
                var episode = cbus.data.episodes[i];

                var episodeElem = document.createElement("cbus-episode");
                episodeElem.title = episode.title;
                episodeElem.date = moment(episode.date).calendar();
                episodeElem.image = episode.feed.image;
                episodeElem.feedTitle = episode.feed.title;
                episodeElem.description = decodeHTML(episode.description);
                episodeElem.url = episode.url;
                episodeElem.dataset.id = episode.id;

                $(".list--episodes").append(episodeElem);
            };

            break;
        case "player":
            $(".player_detail_image").css({ backgroundImage: "url(" + data.feed.image + ")" });
            $(".player_detail_title").text(data.title);
            $(".player_detail_feed-title").text(data.feed.title);
            $(".player_detail_date").text(moment(data.date).calendar());
            $(".player_detail_description").html(data.description);

            // description links open in new tab
            $(".player_detail_description a").attr("target", "_blank");
    }
};

cbus.ui.showSnackbar = function(content, type, buttons) {
    var n;

    if (!type) {
        var type = "notification";
    }

    n = noty({
        text: content,
        type: type,

        animation: {
            open: { height: "toggle" },
            close: { height: "toggle" },
            easing: "swing",
            speed: 300
        },
        timeout: 5000,
        layout: "bottomLeft",
        theme: "material"
    });

    n.$bar.css({ transform: "translateY(-58px)" });

    if (buttons && Array.isArray(buttons)) {
        n.$message.append("<div class='snackbar_buttons'></div>");
        for (button of buttons) {
            n.$message.find(".snackbar_buttons").append(
                $("<button class='snackbar_button'></button>").text(button.text).on("click", function() {
                    button.onClick();
                })
            );
        }
    }

    return n;
};

cbus.ui.tabs = {};
cbus.ui.tabs.switch = function(options) {
    if (options.id || !Number.isNaN(options.index)) {
        var $target, $origin;

        if (options.id) {
            $target = $(".content#" + options.id);
            $origin = $("header nav a[data-target='" + options.id + "']");
        } else { // options.index
            $target = $(".content").eq(options.index);
            $origin = $("header nav a").eq(options.index);
        }

        /* show/hide contents */

        $(".content").removeClass("current"); // remove 'current' class from all tabs

        $target.removeClass("left");
        $target.removeClass("right");
        $target.addClass("current");

        var targetIndex = $target.parent().children().index($target);

        for (var i = 0; i < targetIndex; i++) {
            $target.parent().children().eq(i).removeClass("right");
            $target.parent().children().eq(i).addClass("left");
        }

        for (var i = targetIndex + 1; i < $target.parent().children().length; i++) {
            $target.parent().children().eq(i).removeClass("left");
            $target.parent().children().eq(i).addClass("right");
        }

        /* highlight/unhighlight nav buttons */

        $("header nav a").removeClass("current");
        $origin.addClass("current");

        /* show/hide header buttons */

        var scopeButtons = $("[data-scope='" + $target.attr("id") + "']");
        scopeButtons.addClass("visible");
        $(".header_action").not(scopeButtons).removeClass("visible");

        return;
    }
    return false;
};

cbus.ui.colorify = function(options) {
    var element = $(options.element);

    var colorThiefImage = document.createElement("img");
    colorThiefImage.src = "/app/proxy?url=" + encodeURIComponent(options.image);
    colorThiefImage.onload = function() {
        var colorThief = new ColorThief();
        var colorRGB = colorThief.getColor(colorThiefImage);
        var colorRGBStr = "rgb(" + colorRGB.join(",") + ")";
        var colorL = 0.2126 * colorRGB[0] + 0.7152 * colorRGB[1] + 0.0722 * colorRGB[2];

        element.css({ backgroundColor: colorRGBStr });
        if (colorL < 158) {
            element.addClass("light-colors");
        } else {
            element.removeClass("light-colors");
        }
    };
    if (colorThiefImage.complete) {
        colorThiefImage.onload();
    }
};

/* moving parts */

cbus.broadcast.listen("showPodcastDetail", function(e) {
    $("body").addClass("podcast-detail-visible"); // open sidebar without data

    // display
    $(".podcast-detail_header").css({ backgroundColor: "" });
    $(".podcast-detail_header_image").css({ backgroundImage: "" });
    $(".podcast-detail_header_title").empty();
    $(".podcast-detail_header_publisher").empty();
    $(".podcast-detail_control--toggle-subscribe").removeClass("subscribed").off("click");
    $(".podcast-detail_episodes").empty();
    $(".podcast-detail_header_description").empty();

    setTimeout(function() {
        $(".content-container").on("click", function() {
            document.body.classList.remove("podcast-detail-visible");
            cbus.data.state.podcastDetailCurrentData = { url: null };
            $(".content-container").off("click");
        });
    }, 10); // needs a timeout to work, for some reason

    $(".podcast-detail_header").removeClass("light-colors");
});

cbus.broadcast.listen("gotPodcastData", function(e) {
    $(".podcast-detail_header_image").css({ backgroundImage: "url(proxy?url=" + encodeURIComponent(e.data.image) + ")" });
    $(".podcast-detail_header_title").text(e.data.title);
    $(".podcast-detail_header_publisher").text(e.data.publisher);
    if (e.data.description) {
        $(".podcast-detail_header_description").text(removeHTMLTags(e.data.description));
    }

    if (cbus.data.feedIsSubscribed({ url: cbus.data.state.podcastDetailCurrentData.url })) {
        $(".podcast-detail_control--toggle-subscribe").addClass("subscribed");
    }
    $(".podcast-detail_control--toggle-subscribe").on("click", function() {
        var broadcastData = {
            url: cbus.data.state.podcastDetailCurrentData.url,
            image: e.data.image,
            title: e.data.title
        };

        cbus.broadcast.send("toggleSubscribe", broadcastData);
    });

    // colorify

    cbus.ui.colorify({
        image: e.data.image,
        element: $(".podcast-detail_header")
    });
});

cbus.broadcast.listen("gotPodcastEpisodes", function(e) {
    for (episode of e.data.episodes) {
        var elem = document.createElement("cbus-podcast-detail-episode");

        var description = decodeHTML(episode.description);
        var descriptionWords = description.split(" ");
        if (descriptionWords.length > 50) {
            descriptionWords.length = 50;
            description = descriptionWords.join(" ") + "…";
        }

        $(elem).attr("title", episode.title);
        $(elem).attr("date", moment(episode.date).calendar());
        $(elem).attr("description", description);
        $(elem).attr("id", episode.id);
        $(".podcast-detail_episodes").append(elem);
    }
});

/* listen for queue change */
cbus.broadcast.listen("queueChanged", function() {
    if (cbus.audio.queue.length === 0) {
        $(document.body).addClass("queue-empty");
    } else {
        $(document.body).removeClass("queue-empty");
    }

    $(".list--queue").html("");
    for (queueItem of cbus.audio.queue) {
        var data = cbus.data.getEpisodeData({ audioElement: queueItem });

        var queueItemElem = document.createElement("cbus-episode");

        queueItemElem.title = data.title;
        queueItemElem.feedTitle = data.feed.title;
        queueItemElem.image = data.feed.image;
        queueItemElem.isQueueItem = true;

        $(queueItemElem).on("click", function() {
            var index = $(".list--queue cbus-episode").index(this);
            console.log("click", index, this);
            cbus.audio.playQueueItem(index);
        });

        $(".list--queue").append(queueItemElem);
    }
}, true);

/* listen for J and L keyboard shortcuts */
$(document).on("keypress", function(e) {
    if (e.keyCode === KEYCODES.j || e.keyCode === KEYCODES.J) {
        cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_BACKWARD);
    } else if (e.keyCode === KEYCODES.l || e.keyCode === KEYCODES.L) {
        cbus.audio.jump(cbus.audio.DEFAULT_JUMP_AMOUNT_FORWARD);
    } else if (e.keyCode === KEYCODES.k || e.keyCode === KEYCODES.K) {
        if (cbus.audio.element.paused) {
            cbus.audio.play();
        } else {
            cbus.audio.pause();
        }
    }
});

// $(".settings_button--remove-duplicate-feeds").on("click", function() {
//     cbus.broadcast.send("removeDuplicateFeeds");
// });
//
// $(".settings_button--update-feed-artworks").on("click", function() {
//     cbus.broadcast.send("updateFeedArtworks");
// });

$(".settings_button--generate-opml").on("click", function() {
    cbus.broadcast.send("makeFeedsBackup");
});
