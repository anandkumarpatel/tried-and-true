import get from 'axios'
import { load } from 'cheerio'
import TurndownService from 'turndown'
var turndownService = new TurndownService()

const url = 'https://lovelydelites.com/pumpkin-shaped-gnocchi/'

get(url)
  .then((response) => {
    const html = response.data
    const $ = load(html)
    $('script').remove()
    $('header').remove()
    $('footer').remove()
    $('style').remove()
    $('link').remove()
    $('[class*="comment"]').remove()
    const body = $('body').html()
    if (!body) {
      throw new Error('No body found')
    }
    var markdown = turndownService.turndown(body)

    console.log(markdown)
  })
  .catch((error) => {
    console.error('Error fetching the webpage:', error)
  })
