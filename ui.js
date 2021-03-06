$(async function() {
    // cache some selectors we'll be using quite a bit
    const $allStoriesList = $("#all-articles-list");
    const $filteredArticles = $("#filtered-articles");
    const $loginForm = $("#login-form");
    const $createAccountForm = $("#create-account-form");
    const $ownStories = $("#my-articles");
    const $navLogin = $("#nav-login");
    const $navLogOut = $("#nav-logout");
    const $newStoryForm = $("#submit-form");
    const $newStory = $("#new-story");
    const $favs = $("#favorited-articles");
    const $articles = $(".articles-container");
    const $myStoryBtn = $("#my-story-btn");

    // global storyList variable
    let storyList = null;

    // global currentUser variable
    let currentUser = null;
    await checkIfLoggedIn();

    /**
     * Event listener for logging in.
     *  If successfully we will setup the user instance
     */

    $loginForm.on("submit", async function(evt) {
        evt.preventDefault(); // no page-refresh on submit

        // grab the username and password
        const username = $("#login-username").val();
        const password = $("#login-password").val();

        // call the login static method to build a user instance
        const userInstance = await User.login(username, password);
        // set the global user to the user instance
        currentUser = userInstance;
        syncCurrentUserToLocalStorage();
        loginAndSubmitForm();
    });

    /**
     * Event listener for signing up.
     *  If successfully we will setup a new user instance
     */

    $createAccountForm.on("submit", async function(evt) {
        evt.preventDefault(); // no page refresh

        // grab the required fields
        let name = $("#create-account-name").val();
        let username = $("#create-account-username").val();
        let password = $("#create-account-password").val();

        // call the create method, which calls the API and then builds a new user instance
        const newUser = await User.create(username, password, name);
        currentUser = newUser;
        syncCurrentUserToLocalStorage();
        loginAndSubmitForm();
    });

    /**
     * Log Out Functionality
     */

    $navLogOut.on("click", function() {
        // empty out local storage
        localStorage.clear();
        // refresh the page, clearing memory
        location.reload();
    });

    /**
     * Event Handler for Clicking Login
     */

    $navLogin.on("click", function() {
        // Show the Login and Create Account Forms
        $loginForm.slideToggle();
        $createAccountForm.slideToggle();
        $allStoriesList.toggle();
    });
    $("#new-story-btn").on("click", function() {
        // Show the Login and Create Account Forms
        $newStoryForm.slideToggle();
    });

    /**
     * Event handler for Navigation to Homepage
     */

    $("body").on("click", "#nav-all", async function() {
        hideElements();
        await generateStories();
        $allStoriesList.show();

    });

    /**
     * On page load, checks local storage to see if the user is already logged in.
     * Renders page information accordingly.
     */

    async function checkIfLoggedIn() {
        // let's see if we're logged in
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        // if there is a token in localStorage, call User.getLoggedInUser
        //  to get an instance of User with the right details
        //  this is designed to run once, on page load
        currentUser = await User.getLoggedInUser(token, username);
        await generateStories();

        if (currentUser) {
            showNavForLoggedInUser();
        }
    }

    /**
     * A rendering function to run to reset the forms and hide the login info
     */

    function loginAndSubmitForm() {
        // hide the forms for logging in and signing up
        $loginForm.hide();
        $createAccountForm.hide();

        // reset those forms
        $loginForm.trigger("reset");
        $createAccountForm.trigger("reset");

        // show the stories
        $allStoriesList.show();

        // update the navigation bar
        showNavForLoggedInUser();
        generateStories();
    }

    /**
     * A rendering function to call the StoryList.getStories static method,
     *  which will generate a storyListInstance. Then render it.
     */

    async function generateStories() {
        // get an instance of StoryList
        const storyListInstance = await StoryList.getStories();
        // update our global variable
        storyList = storyListInstance;
        // empty out that part of the page
        $allStoriesList.empty();

        // loop through all of our stories and generate HTML for them
        for (let story of storyList.stories) {
            const result = generateStoryHTML(story);
            //changes color of favoites icon
            try {
                addIcons(story, result);
            } catch (error) {} finally {
                $allStoriesList.append(result);
            }
        }
        userInfo()
    }

    //show user favorites
    $("#favoritesBtn").on("click", function() {
        generateFavs();
        hideElements()
        $favs.show();

    });

    //generate favorites
    function generateFavs() {
        const userFavs = currentUser.favorites;
        $favs.empty();
        for (let favs of userFavs) {
            const result = generateStoryHTML(favs);
            //adds delet icon to user's posts
            if (favs.username == currentUser.username) {
                result.find("button").removeClass("hidden");
            }
            $favs.append(result);
        }
    }
    /**
     * A function to render HTML for an individual Story instance
     */

    function generateStoryHTML(story) {
        let hostName = getHostName(story.url);

        // render story markup
        const storyMarkup = $(`
      
    <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <button class="delete-btn hidden"><i class="fa fa-trash" aria-hidden="true"></i></button>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <div class="flexbox">
	        <div class="fav-btn">
		        <span href="" class="favme fa fa-heart-o"></span>
	        </div>
        </div>
        <small class="article-username">posted by ${story.username}</small>

      </li>

    `);

        return storyMarkup;
    }

    /* hide all elements in elementsArr */

    function hideElements() {
        const elementsArr = [
            $allStoriesList,
            $filteredArticles,
            $ownStories,
            $loginForm,
            $createAccountForm,
            $favs
        ];
        elementsArr.forEach(($elem) => $elem.hide());
    }

    function showNavForLoggedInUser() {
        $navLogin.hide();
        $navLogOut.show();
        $newStory.show();
        $("#favoritesBtn").show();
        $("#new-story-btn").show();
        $myStoryBtn.show();
    }

    /* simple function to pull the hostname from a URL */

    function getHostName(url) {
        let hostName;
        if (url.indexOf("://") > -1) {
            hostName = url.split("/")[2];
        } else {
            hostName = url.split("/")[0];
        }
        if (hostName.slice(0, 4) === "www.") {
            hostName = hostName.slice(4);
        }
        return hostName;
    }

    /* sync current user information to localStorage */

    function syncCurrentUserToLocalStorage() {
        if (currentUser) {
            localStorage.setItem("token", currentUser.loginToken);
            localStorage.setItem("username", currentUser.username);
        }
    }
    //creates a new story
    $newStoryForm.on("submit", async function createNewStory(event) {
        event.preventDefault();
        const story = { author: $("#author").val(), title: $("#title").val(), url: $("#url").val() };
        await StoryList.addStory(currentUser, story);
        await checkIfLoggedIn();
        $("#author").val("");
        $("#title").val("");
        $("#url").val("");
        $newStoryForm.hide();
    });
    //adds or removes favorites
    $articles.on("click", ".flexbox", async function(event) {
        const postID = $(event.target).closest("li").attr("id");

        try {
            const isFav = checkFav(currentUser.favorites, postID);
            if (isFav) {
                let resp = await User.removeFavorite(currentUser, postID);
                alert (resp.message)
            } else {
                let resp = await User.addFavorite(currentUser, postID);
                alert (resp.message)
            }
            refresh();
        } catch (error) {
            alert("You must be logged in to add to favorites");
        }
    });
    //check story against user favorites
    function checkFav(obj, id) {
        let isFav = false;
        for (object of obj) {
            if (object.storyId == id) {
                isFav = true;
            }
        }
        return isFav;
    }
    //deletes posts
    $articles.on("click", ".delete-btn", async function(event) {
        const postID = $(event.target).closest("li").attr("id");
        await deleteStory(currentUser.loginToken, postID);
        refresh();
    });
    //handles click to see my stories
    $myStoryBtn.on("click", function() {
        generateMyStories();
        hideElements()
        $ownStories.show();

    });
    //generates my stories
    function generateMyStories() {
        $ownStories.empty();
        for (let story of currentUser.ownStories) {
            const result = generateStoryHTML(story);
            addIcons(story, result);
            $ownStories.append(result);
        }
    }
    //updates user profile section to show current user
    function userInfo() {
        try {
            $("#profile-name").text(`Name: ${currentUser.name}`);
            $("#profile-username").text(`Username: ${currentUser.username}`);
            $("#profile-account-date").text(`Date created: ${currentUser.createdAt}`);
            $("#user-profile").show();
        } catch {
            $("#user-profile").hide();
        }

    }
    //adds favorite and delete icons to stories
    function addIcons(story, result) {
        const isFave = checkFav(currentUser.favorites, story.storyId);
        if (isFave) {
            result.find("span").addClass("active");
        }
        //adds delet icon to user's posts
        if (story.username == currentUser.username) {
            result.find("button").removeClass("hidden");
        }
    }


    //refreshing updated stories
    async function refresh() {
        await checkIfLoggedIn();
        generateFavs();
        generateMyStories();
    }
});