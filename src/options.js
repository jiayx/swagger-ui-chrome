var url = ''

window.onload = function () {
    // 加载主题
    loadThemes()

    // 保存选项
    document.getElementById('save').onclick = function() {
        console.log(url)
        if (url != '') {
            if (url == 'default') {
                localStorage.removeItem('theme')
                alert('Success')
                return
            }

            fetch(url).then(function(response) {
                return response.text()
            }).then(function(text) {
                localStorage.setItem('theme', text)
                alert('Success')
            }).catch(function(e) {
                alert('Fetch theme error, please try again')
            })
        }
    }
}

function loadThemes() {
    console.log('load themes')
    var res = fetch('https://github.com/ostranme/swagger-ui-themes/tree/develop/themes/3.x')
    res.then(function(response) {
        return response.text()
    }).then(parseTheme)
    .catch(function(e) {
        console.log(e)
        alert('Fetch theme error, please check your network')
    })
}

function parseTheme(text) {
    console.log('parse themes')
    var ul = document.getElementsByTagName('ul')[0]
    var regex = /<a class="js-navigation-open.*?" title=".*?".+href="(.*?)">theme-(.*?).css<\/a>/g
    var match, index = 0

    // 默认主题
    var defaultTheme = document.createElement('li')
    defaultTheme.onclick = handleClick
    defaultTheme.innerHTML = '<p><input type="radio" name="theme" id="default" value="default"> 0. default</p>'
    defaultTheme.dataset.url = 'default'
    defaultTheme.dataset.name = 'default'
    ul.append(defaultTheme)

    while (match = regex.exec(text)) {
        index++
        var theme = {
            name: match[2],
            url: 'https://raw.githubusercontent.com' + match[1].replace('\/blob', ''),
            screenshot: 'https://raw.githubusercontent.com' + match[1].replace('themes/3.x/theme', 'screenshots/3.x/3.x').replace('\.css', '\.png').replace('\/blob', ''),
        }

        var li = document.createElement('li')
        li.onclick = handleClick
        li.innerHTML = `<p><input type="radio" name="theme" id="${theme.name}" value="${theme.url}"> ${index}. ${theme.name}</p><img src="${theme.screenshot}" alt="${theme.name}">`
        li.dataset.url = theme.url
        li.dataset.name = theme.name
        ul.append(li)
    }
}

function handleClick() {
    console.log(this)
    this.childNodes[0].childNodes[0].checked = true
    url = this.dataset.url
}
