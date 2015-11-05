module.exports = {
    navigate: function(dest, start) {
        var url ="bingmaps:?rtp=";

        function do_goto(url) {
            url += "~pos." + dest[0] + "_" + dest[1];

            try {
                window.location = url;
            } catch(e) {
                console.error(e);
            }
        }

        if (start) {
            url += "pos." + start[0] + "_" + start[1];
            do_goto(url);
        } else {
            do_goto(url);
        }
    };
};
