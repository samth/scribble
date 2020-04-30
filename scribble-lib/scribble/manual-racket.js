/* For the Racket manual style */

AddOnLoad(function() {
    /* Look for header elements that have x-source-module and x-part tag.
       For those elements, add a hidden element that explains how to
       link to the section, and set the element's onclick() to display
       the explanation. */
    var tag_names = ["h1", "h2", "h3", "h4", "h5"];
    for (var j = 0; j < tag_names.length; j++) {
        elems = document.getElementsByTagName(tag_names[j]);
        for (var i = 0; i < elems.length; i++) {
            var elem = elems.item(i);
            AddPartTitleOnClick(elem);
        }
    }
})

// cache of source urls
var cache = new Map();

function ParseSource(source, mod_path) {
    let pkg_url = null, drop_pkg_url = null;
    var source_path_re = /^(https|git|github):\/\/\github.com\/([^\/]+)\/([^\/]+)(\/)?\?path=(.+)$/;
    var source_no_path_re = /^(https|git|github):\/\/\github.com\/([^\/]+)\/([^\/]+)(\/)?$/;
    var mod_path_re = /^\(lib "(.+)"\)$/;
    var drop_mod_path_re = /^\(lib "[^\/]+\/(.+)"\)$/;

    console.log("path_re", source, source.match(source_path_re));
    console.log("no_path_re", source, source.match(source_no_path_re));
    console.log(mod_path, mod_path.match(mod_path_re));

    source_found = source && (source.match(source_path_re) || source.match(source_no_path_re)) ;
    mod_path_found = mod_path && mod_path.match(mod_path_re);
    drop_mod_path_found = mod_path && mod_path.match(drop_mod_path_re);

    source_user = source_found[2];
    source_repo = source_found[3];
    source_path = source_found[5];

    console.log(source_user, source_repo, source_path)

    file_path = mod_path_found[1];
    drop_file_path = drop_mod_path_found[1];

    let full_file_path = file_path;
    let drop_full_file_path = drop_file_path;

    if (source_path) {
        full_file_path = source_path + "/" + full_file_path;
        drop_full_file_path = source_path + "/" + drop_full_file_path;
    }

    return [source_user, source_repo, full_file_path, drop_full_file_path];
}

console.log(ParseSource("git://github.com/racket/racket/?path=pkgs/racket-doc",
                        "(lib \"scribblings/reference/reference.scrbl\")",
                       []))

function AddSourceElement(pkg_url, info) {
    info.appendChild(document.createTextNode("Document source "));
    var url_line = document.createElement("div");
    var a = document.createElement("a");
    a.href = pkg_url;
    a.style.whiteSpace = "nowrap";
    a.appendChild(document.createTextNode(pkg_url));
    addSpan(url_line, "\xA0", "RktRdr");
    url_line.appendChild(a);
    info.appendChild(url_line);
}


function AddSourceUrl(source, mod_path, collection, info) {

    console.log(source, mod_path);

    // multi is encoded as an array, empty as false
    single_collection = (typeof collection === "string");

    let [user, repo, no_drop_path, drop_path] = source && mod_path && ParseSource(source, mod_path);

    let path = single_collection ? drop_path : no_drop_path;
    let branch = "master";

    let correct_url = `https://github.com/${source_user}/${source_repo}/tree/${branch}/${path}`;
    AddSourceElement(correct_url, info);
}

function addSpan(dest, str, cn) {
    var s = document.createElement("span");
    s.className = cn;
    s.style.whiteSpace = "nowrap";
    s.appendChild(document.createTextNode(str));
    dest.appendChild(s);
}



function AddPartTitleOnClick(elem) {
    var mod_path = elem.getAttribute("x-source-module");
    var tag = elem.getAttribute("x-part-tag");
    var source_pkg = elem.getAttribute("x-source-pkg");

    // create here to share
    var info = document.createElement("div");


    // tag is not needed, but this way we can add the element in only one place
    if (mod_path && source_pkg && tag) {

        let cached_val = cache.get(mod_path + "$$$" + source_pkg);
        if (cached_val) {
            AddSourceElement(cached_val, info);
        }
        else {
            fetch(`https://pkgd.racket-lang.org/pkgn/pkg/${source_pkg}.json`)
                .then(response => response.json())
                .then(function (data) {
                    var vers = data["versions"] || {};
                    var def = vers["default"] || {};
                    var source = def["source"] || undefined;
                    var collection = data["collection"];

                    source && AddSourceUrl(source, mod_path, collection, info);
                });
        }
    }

    if (mod_path && tag) {
        // Might not be present:
        var prefixes = elem.getAttribute("x-part-prefixes");

        info.className = "RPartExplain";

        /* The "top" tag refers to a whole document: */
        var is_top = (tag == "\"top\"");
        info.appendChild(document.createTextNode("Link to this "
                                                 + (is_top ? "document" : "section")
                                                 + " with "));

        /* Break `secref` into two lines if the module path and tag
           are long enough: */
        var is_long = (is_top ? false : ((mod_path.length
                                          + tag.length
                                          + (prefixes ? (16 + prefixes.length) : 0))
                                         > 60));

        var line1 = document.createElement("div");
        var line1x = ((is_long && prefixes) ? document.createElement("div") : line1);
        var line2 = (is_long ? document.createElement("div") : line1);

        /* Construct a `secref` call with suitable syntax coloring: */
        addSpan(line1, "\xA0@", "RktRdr");
        addSpan(line1, (is_top ? "other-doc" : "secref"), "RktSym");
        addSpan(line1, "[", "RktPn");
        if (!is_top)
            addSpan(line1, tag, "RktVal");
        if (is_long) {
            /* indent additional lines: */
            if (prefixes)
                addSpan(line1x, "\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0", "RktPn");
            addSpan(line2, "\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0", "RktPn");
        }
        if (prefixes) {
            addSpan(line1x, " #:tag-prefixes ", "RktPn");
            addSpan(line1x, "'", "RktVal");
            addSpan(line1x, prefixes, "RktVal");
        }
        if (!is_top)
            addSpan(line2, " #:doc ", "RktPn");
        addSpan(line2, "'", "RktVal");
        addSpan(line2, mod_path, "RktVal");
        addSpan(line2, "]", "RktPn");

        info.appendChild(line1);
        if (is_long)
            info.appendChild(line1x);
        if (is_long)
            info.appendChild(line2);

        info.style.display = "none";

        /* Add the new element afterthe header: */
        var n = elem.nextSibling;
        if (n)
            elem.parentNode.insertBefore(info, n);
        else
            elem.parentNode.appendChild(info);

        /* Clicking the header shows the explanation element: */
        elem.onclick = function () {
            if (info.style.display == "none")
                info.style.display = "block";
            else
                info.style.display = "none";
        }
    }
}
