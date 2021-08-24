
const rp = require('request-promise');
const $ = require('cheerio');
const fs = require('fs');
const request = require('request');
var shell = require('shelljs');
const axios = require('axios');
var path = require('path');
var getDirName = require('path').dirname;
var mkdirp = require('mkdirp');
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
var webdriver = require('selenium-webdriver'),
    By = webdriver.By;
var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build();
const action = driver.actions;

const domain = "https://alluraaesthetics.com/";
const urls = [
    '/blog/'

]


const download = function (uri, filename, callback) {
    request.head(encodeURI(uri), function (err, res, body) {
        mkdirp(getDirName(filename), function (err) {
            if (err) return cb(err);
            request(encodeURI(uri)).pipe(fs.createWriteStream(filename)).on('close', callback);
        });
    });
};

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

urls.reverse(); //reverse array order because we are using the pop method

scrape(urls, "", []);
async function scrape(urls, blogIndexContent, blogUrls) {

    await sleep(1000).then(() => {
        //set limiter time here
        if (urls.length > 0) {
            sleep(100).then(() => {
                (async function run() {
                    try {
                        let blogIndexContentRaw = "";

                        const res1 = await driver.get(domain + urls.pop());
                        /* Button Click Function */
                        const view_more = driver.findElement(By.id("view-more"));
                        driver.executeScript("arguments[0].click();", view_more)
                        await sleep(1000);
                        driver.executeScript("arguments[0].click();", view_more)
                        await sleep(1000);
                        htmlD = await driver.getPageSource();
                        htmlD = htmlD.toString("/");


                        /* SET BLOG INDEX CONTENT ITEMS HERE */
                        $(".postlist__card", htmlD).each(function () {
                            blogIndexContentRaw += "<div>" + $(this).html() + "</div>";
                        });
                        blogIndexContent = "";
                        $(".postlist__card__image", blogIndexContentRaw).each(function () {
                            let img = $(this).attr("data-bg"); //change whether lazy loaded or not
                            img = img.replace(/url\('/i, "https:");
                            img = img.replace(/\?.*/i, ""); //change whether lazy loaded or not
                            let newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
                            const newImgPath = __dirname + newImgUrl;
                            download(img, newImgPath, function () { });
                        });

                        /* SET INDIVIDUAL BLOG URLS HERE */
                        $(".postlist a", htmlD).each(function () {
                            const blogUrl = $(this).attr("href");
                            console.log(blogUrl);
                            blogUrls.push(blogUrl);
                        });
                        blogIndexContent = blogIndexContentRaw;
                        scrape(urls, blogIndexContent, blogUrls);
                    } finally {
                        console.log('Page Loaded');
                    }
                })();
            });
        }
        else if (blogUrls.length > 0) {
            newBlogUrl = domain + blogUrls.pop();
            sleep(100).then(() => {
                (async function run() {
                    try {
                        const res1 = await driver.get(newBlogUrl);
                        htmlD = await driver.getPageSource();
                        htmlD = htmlD.toString();
                        /* SET BLOG CONTENT ITEMS HERE */
                        const title = $("title", htmlD).text();
                        const seodesc = $("meta[name='description']", htmlD).attr("content");
                        const h1 = $(".title", htmlD).text(); //change based on the title of the blog post on the page
                        let content = $(".page-content", htmlD).html(); //set based on the content blog for the blog html on the page


                        /* DOWNLOAD ALL IMAGES */
                        $img = $.load(content);
                        $img("img").each(function () {
                            let img = $img(this).attr("data-src");
                            img = img.replace(/\?.*/i, "");
                            console.log(img) //change whether lazy loaded or not
                            const newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
                            const newImgPath = __dirname + newImgUrl;
                            download(img, newImgPath, function () { });
                            $img(this).attr("data-src", newImgUrl);
                        });

                        // $("img", content).each(function () {
                        //     let img = $(this).attr("src"); //change whether lazy loaded or not
                        //     if (!img.toString().startsWith('/assets/img/blog')) {
                        //         if (img.toString().startsWith('/wp-content/')) {
                        //             img = domain + img;
                        //         }
                        //         let newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
                        //         const newImgPath = __dirname + newImgUrl;
                        //         download(img, newImgPath, function () { });
                        //         console.log($(this).toString());
                        //         content = content.toString().replace($(this).toString(), '<img src="' + newImgUrl + '">');
                        //         console.log(content);
                        //     }
                        // });

                        $("figure", content).each(function () {
                            content.replace($(this).html().toString(), "<!-- " + $(this).html().toString() + " -->");
                        });

                        WritePage(title, seodesc, h1, content, newBlogUrl);
                        scrape(urls, blogIndexContent, blogUrls);

                    } finally {
                        console.log('Page Loaded');
                    }
                })();
            });
        }
        else {
            WritePage("Blog", "", "Blog", blogIndexContent, ".com/blog");
            console.log("we did it - we're heroes");
        }
    });
}

function WritePage(title, seodesc, h1, content, newBlogUrl) {
    let phpfile = `
  <?php
  $seotitle = "${title}";
  $seodesc = "${seodesc}";
  $section = "blog";
  ?>

  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/header.php" ?>
    
  <section class="masthead bg-image animate box-shadow-smooth zoomOutBg bg-image-left-mobile bg-image-top" style="--bgImage: url(/assets/img/masthead/home1.jpg); background-color: black;">
    <div class="container pb150 pb50-mobile">
        <div class="text-center">
        <h1 class="text-center white uppercase animate fadeIn"><span class="title-lg block relative mb0 animate fadeIn">${h1} </span><span class="masthead-subtitle block"><?php echo $sitename ?></span></h1>
        </div>
    </div>
    </section>


  <section class="mv100">
    <div class="container">
      <div class="mw1200">
        ${content}

      </div>
    </div>
  </section>

  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/request-consult.php" ?>
  <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/footer.php" ?>

  <script>
  </script>`;

    newBlogUrl = newBlogUrl.split('.com/');
    newBlogUrl = newBlogUrl[1];
    console.log(newBlogUrl);
    newBlogUrl = 'blog/' + newBlogUrl;
    shell.mkdir('-p', newBlogUrl);
    const wstream = fs.createWriteStream(newBlogUrl + '/index.php');
    wstream.write(phpfile);
    wstream.end();
}
