## Mapping

Simulate data file path has the schema:

    REQUEST_PATH_WITHOUT_EXTENSION[?QUERY][.HTTP_METHOD].FILE_EXTENSION
    
For a HTTP request

    GET /a/b/c.html?a=b&c=d HTTP/1.1
    User-Agent: curl/7.37.1
    Host: baidu.com
    Accept: */*

* `REQUEST_PATH_WITHOUT_EXTENSION` is `"/a/b/c"`
* `QUERY` is optional, could be `"a=b"`, `"c=d"` or `"a=b&c=d"`
* `HTTP_METHOD` is optional, and should be uppercase if appears. Could be `"GET"`
* `FILE_EXTENSION` have nothing to do with HTTP request, it only represent the content type of your simulate data file type, normally being `"json"`

### path
Request maps to local simulate data file by it's `uri` path.

For a given path, `/path/to/resource`, `mock-locator` will use `<MOUNT>/path/to/resource.json`
as it's simulate data file.

### HTTP method
You can use optional HTTP method to distinguish request with same `uri` but
difference HTTP method.

For example, ajax request `/multiact/a` with method `GET` will match simulate
data file `multiact/a.GET.json` or `multiact/a.GET.json` (method is optional).
ajax request `/multiact/b` with method `POST` match simulate data file
`multiact/b.POST.json` or `multiact/b.json`.

### querystring
It's also possible to match querystring in request `uri`.

For example, `/deal/123?a=b&c=d`'s simulate data file could be

* `deal/123`
* `deal/123?a=b`
* `deal/123?c=d`
* `deal/123?a=b&c=d`
* `deal/123?c=d&a=b`

The order of querystring don't matters.


### wildcard
Wildcard can be used to match multiple request, for example, simulate data file
`/deal/:id` matches request `/deal/123` and `/deal/abc`.

Wildcard can also used inside querys, for example

    file                                           | request
                                                   |
    GET /ktv/return/order?orderid=1418565177536196 | ktv/return/order?orderid=:orderid.GET.json


### priority
A sinelg request can match multiple simulate data files. For example, `/deal/123`
both match file `deal/:id.GET.json` and `deal/123.GET.json`. But `mock-locator`
will use `deal/123.GET.json` as final simulate data file because exact match has 
higher priority then wildcard match.


### Examples

    request                                        | file
                                                   |
    GET /                                          | index.GET.json
    GET /shops                                     | shops.GET.json
    GET /shops/                                    | shops/index.GET.json
    POST /multiact/default                         | multiact/default.POST.json
    GET /deal/123456                               | deal/:id.GET.json
    GET /ktv/return/order?orderid=1418565177536196 | ktv/return/order?orderid=:id.GET.json
