const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.hostname === "www.sfmemo.com" || (url.hostname === "sfmemo.com" && url.protocol === "http:")) {
      url.protocol = "https:";
      url.hostname = "sfmemo.com";
      if (url.pathname === "/index.html") {
        url.pathname = "/";
      }
      return Response.redirect(url, 308);
    }

    if (url.pathname === "/index.html") {
      url.pathname = "/";
      return Response.redirect(url, 308);
    }

    if (url.pathname === "/_document.txt") {
      return new Response("Not found", { status: 404 });
    }

    const assetUrl = new URL(url);
    const isHomepage = assetUrl.pathname === "/";
    if (isHomepage) {
      assetUrl.pathname = "/_document.txt";
    }

    const response = await env.ASSETS.fetch(new Request(assetUrl, request));

    if (isHomepage && response.status === 200) {
      const headers = new Headers(response.headers);
      headers.set("Content-Type", "text/html; charset=UTF-8");
      headers.set("X-Robots-Tag", "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1");
      headers.append("Link", '<https://sfmemo.com/>; rel="canonical"');
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return response;
  },
};

export default worker;
