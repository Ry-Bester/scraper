
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

const domain = "https://alluraaesthetics.com";
const urls = [
  '/blog/',
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
let imgAssetCounter = 0;
async function scrape(urls, blogIndexContent, blogUrls) {
  await sleep(5000).then(() => { //set limiter time here
    if (urls.length > 0) {
      sleep(100).then(() => {
        (async function run() {
          try {
            let blogIndexContentRaw = "";
            const res1 = await driver.get(domain + urls.pop());
            htmlD = await driver.getPageSource();
            htmlD = htmlD.toString();


            /* SET BLOG INDEX CONTENT ITEMS HERE */
            $(".postlist__card", htmlD).each(function () {
              blogIndexContentRaw += "<div>" + $(this).html() + "</div>";
            });
            let postHolder = [];
            blogIndexContent = "";
            let counter = 0;
            $("a", blogIndexContentRaw).each(function () {
              if (!$(this).attr("href").toString().startsWith('/travel-1/tag') && !$(this).attr("href").toString().startsWith('/travel-1/category') && !$(this).attr("href").toString().startsWith('/travel-1?')) {
                let occurred = false;
                for (let post of postHolder) {
                  if (post["href"] == $(this).attr("href").toString()) occurred = true;
                }
                let href = $(this).attr("href").toString();
                if (!occurred) postHolder[counter++] = { href: href, content: {} };
              }
            });
            counter = 0;


            /* SET BLOG IMAGE HERE */
            $(".postlist__card__image", html).each(function () {
              let img = $(this).attr("data-bg"); //change whether lazy loaded or not
              img = img.replace(/url\('/i, "https:");
              img = img.replace(/\?.*/i, "");
              //url('//assets.alluraaesthetics.com/Images/Sites/A/AlluraAesthetics/699628.png?crop=(0.00,14.84, 2206.00,1255.71)&srotate=0')
              const newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
              const newImgPath = __dirname + newImgUrl;
              download(img, newImgPath, function () { });
              blogIndexContent += `<p class="text-center"><a href="${blogUrl}"><img src='${newImgUrl}' /></p></a>`;
            });


            counter = 0;
            $("p", blogIndexContentRaw).each(function () {
              postHolder[counter++].content.p = `</p>${$(this)}</p>`;
            });
            blogIndexContent += `
                <div class="flexy flexy-pad is-multiline">
                `;
            for (let post of postHolder) {
              blogIndexContent += `
                  <div class="flexy-item is-4 is-6-widescreen">
                    <a href="${post.href}">
                      ${post.content.img}
                      ${post.content.p}
                    </a>
                  </div>`;
            };
            blogIndexContent += `
                </div>
                `;
            /* SET INDIVIDUAL BLOG URLS HERE */
            $(".postlist a", htmlD).each(function () {
              const blogUrl = domain + $(this).attr("href");
              console.log(blogUrl);
              blogUrls.push(blogUrl);
            });
            scrape(urls, blogIndexContent, blogUrls);
          } finally {
            console.log('Page Loaded');
          }
        })();
      });
    }
    else if (blogUrls.length > 0) {
      newBlogUrl = blogUrls.pop();
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
            let contentRaw = $(".page-content", htmlD).html(); //set based on the content blog for the blog html on the page
            let content = "";
            $("p", contentRaw).each(function () {
              content += `
                  <p>${$(this).html()}<p>
                  `;
            });
            content += `
                <div class="flexy flexy-pad is-multiline">
                `;
            /* DOWNLOAD ALL IMAGES */
            $("img", contentRaw).each(function () {
              let img = $(this).attr("data-src"); //change whether lazy loaded or not
              if (img.startsWith('image')) img = "https://" + img;
              let newImgUrl = "/assets/img/blog/" + path.basename(img).trim();
              if (newImgUrl == "/assets/img/blog/image-asset.jpeg") {
                console.log(newImgUrl);
                newImgUrl = `/assets/img/blog/image-asset-${imgAssetCounter++}.jpeg`;
                console.log(newImgUrl);
              }
              const newImgPath = __dirname + newImgUrl;
              download(img, newImgPath, function () { });
              content += `
                  <div class="flexy-item is-4 is-6-widescreen">
                    <img src='${newImgUrl}'>
                  </div>`;
            });
            content += `
                </div>`;

            WritePage(title, seodesc, h1, content, newBlogUrl);
            scrape(urls, blogIndexContent, blogUrls);

          } finally {
            console.log('Page Loaded');
          }
        })();
      });
    }
    else {
      WritePage("Blog", "", "Blog", blogIndexContent, "/blog/");
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

  <section class="masthead">
  <div class="masthead__image bg-image animate zoomOutBg box-shadow-smooth" style="--bgImage: url(/assets/img/masthead/home.jpg);">
  </div>
  <div class="text-right masthead__text">
    <div class="container pt50 pb100">
      <h1 class="title-xl white animate fadeIn mb0 uppercase">${h1}</h1>
    </div>
  </div>
</section>

<section class="bg-image animate fadeInBg pt250 pb150 nmt100 box-shadow-smooth" style="background-color: #FFFFFF; overflow: initial;">
  <div class="container mt100-mobile">
      <?php include $_SERVER['DOCUMENT_ROOT'] . "/assets/inc/logos.php" ?>
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

  newBlogUrl = newBlogUrl.split('/');
  newBlogUrl = newBlogUrl[newBlogUrl.length - 1];
  newBlogUrl = 'blog/' + newBlogUrl;
  shell.mkdir('-p', newBlogUrl);
  const wstream = fs.createWriteStream(newBlogUrl + '/index.php');
  wstream.write(phpfile);
  wstream.end();
}
