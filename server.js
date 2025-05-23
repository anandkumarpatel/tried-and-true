import axios from 'axios'
import bodyParser from 'body-parser'
import * as cheerio from 'cheerio'
import express from 'express'
import fs from 'fs'
import { OpenAI } from 'openai'
import TurndownService from 'turndown'
import { v4 as uuidv4 } from 'uuid'
import dotenv from 'dotenv'
import puppeteer from 'puppeteer' // Add puppeteer import

dotenv.config({ path: '.env.backend' })
// TODO: https://github.com/julianpoy/RecipeClipper

const app = express()
app.use(bodyParser.json())

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  next()
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const log = (...args) => {
  if (!process.env.DEBUG_LOG) return
  console.log(...args)
}
const aiOutputFormat = {
  name: 'recipe',
  strict: false,
  schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title of the recipe.',
      },
      prepTime: {
        type: 'integer',
        description: 'The preparation time for the recipe.',
      },
      prepTimeUnit: {
        type: 'string',
        description: 'The unit of time used for the preparation time.',
      },
      cookTime: {
        type: 'integer',
        description: 'The cooking time for the recipe.',
      },
      cookTimeUnit: {
        type: 'string',
        description: 'The unit of time used for the cooking time.',
      },
      totalTime: {
        type: 'integer',
        description: 'The total time required for the recipe.',
      },
      totalTimeUnit: {
        type: 'string',
        description: 'The unit of time used for the total time.',
      },
      servings: {
        type: 'integer',
        description: 'The maximum number of servings or amount the recipe makes.',
      },
      mainImage: {
        type: 'string',
        description: 'URL of the main image for the recipe.',
      },
      ingredients: {
        type: 'array',
        description: 'List of ingredients used in the recipe.',
        items: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'The quantity of the ingredient.',
            },
            amountUnit: {
              type: 'string',
              description: 'The unit of measurement for the quantity.',
            },
            name: {
              type: 'string',
              description: 'The name of the ingredient.',
            },
            group: {
              type: 'string',
              description: 'The group the ingredient belongs to (e.g. "for the sauce", "frosting").',
            },
            preparation: {
              type: 'string',
              optional: true,
              description: 'How the ingredient should be processed.',
            },
            substitutions: {
              type: 'string',
              optional: true,
              description: 'Possible substitutions for the ingredient.',
            },
            notes: {
              type: 'string',
              optional: true,
              description: 'Additional notes about the ingredient.',
            },
          },
          required: ['amount', 'amountUnit', 'name', 'group'],
          additionalProperties: false,
        },
      },
      directions: {
        type: 'array',
        description: 'Step-by-step directions for preparing the dish.',
        items: {
          type: 'object',
          properties: {
            instruction: {
              type: 'string',
              description: 'The instruction for this step.',
            },
            image: {
              type: 'string',
              description: 'image showing this step.',
            },
          },
          required: ['instruction'],
          additionalProperties: false,
        },
      },
      notes: {
        type: 'array',
        description: 'General notes or tips for the recipe.',
        items: {
          type: 'string',
        },
      },
    },
    required: ['ingredients', 'directions', 'title', 'servings', 'prepTime', 'prepTimeUnit', 'cookTime', 'cookTimeUnit', 'totalTime', 'totalTimeUnit'],
    additionalProperties: false,
  },
}

// Storage abstraction
class RecipeStorage {
  constructor() {
    this.filePath = './db/recipes.local.json'
    this.recipes = this.loadRecipes()
  }

  loadRecipes() {
    if (fs.existsSync(this.filePath)) {
      const data = fs.readFileSync(this.filePath, 'utf-8')
      return JSON.parse(data)
    }
    return []
  }

  saveRecipes() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.recipes, null, 2))
  }

  addRecipe(recipe) {
    recipe.id = uuidv4()
    this.recipes.push(recipe)
    this.saveRecipes()
    return recipe
  }

  getAllRecipes() {
    return this.recipes
  }

  getRecipeById(id) {
    return this.recipes.find((recipe) => recipe.id === id)
  }

  updateById(id, update) {
    const old = this.recipes.find((recipe) => recipe.id === id)
    Object.assign(old, update)
    this.saveRecipes()
    return
  }

  findRecipesWithSimilarIngredients(id) {
    const recipe = this.getRecipeById(id)
    if (!recipe) {
      return []
    }
    const similarRecipes = this.recipes
      .map((r) => {
        const similarIngredients = r.id === id ? [] : r?.ingredients?.filter((i) => recipe.ingredients.some((ri) => ri.name === i.name))?.map((i) => i.name) || []

        return {
          ...r,
          similarIngredients: [...new Set(similarIngredients)],
        }
      })
      .filter((r) => r.similarIngredients.length > 0)

    similarRecipes.sort((a, b) => b.similarIngredients.length - a.similarIngredients.length)
    return similarRecipes
  }

  deleteRecipeById(id) {
    const initialLength = this.recipes.length
    this.recipes = this.recipes.filter((recipe) => recipe.id !== id)
    if (this.recipes.length < initialLength) {
      this.saveRecipes()
    }
  }

  getAllTags() {
    const tags = new Set()
    this.recipes.forEach((recipe) => {
      ;(recipe.tags || []).forEach((tag) => tags.add(tag))
    })
    return Array.from(tags)
  }
}

const recipeStorage = new RecipeStorage()

app.post('/scrape', async (req, res) => {
  const { url } = req.body
  log('Scraping:', url)
  let tag = 'body'
  try {
    let html
    if (url.includes('instagram.com')) {
      log('Using Puppeteer for Instagram URL')
      const browserOptions = {
        args: ['--no-sandbox', '--disable-gpu', '--disable-setuid-sandbox'],
      }
      if (!process.env.DEBUG_LOG) {
        browserOptions.executablePath = '/usr/bin/chromium-browser'
      }
      const browser = await puppeteer.launch(browserOptions)
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle2' })
      html = await page.content()
      await browser.close()
      tag = 'article'
    } else {
      const response = await axios.get(url)
      html = response.data
    }
    const $ = cheerio.load(html)
    $('script').remove()
    $('header').remove()
    $('footer').remove()
    $('style').remove()
    $('link').remove()
    $('[class*="comment"]').remove()
    const body = $(tag).html()
    if (!body) {
      throw new Error('No body found')
    }
    const turndownService = new TurndownService()
    const markdown = turndownService.turndown(body)
    const recipe = await extractRecipeFromText(markdown)
    recipe.sourceUrl = url

    const newRecipe = recipeStorage.addRecipe(recipe)
    res.json({ recipe: newRecipe })
  } catch (error) {
    console.error('Error processing HTML:', error)
    res.status(500).send({ error: `Error processing HTML ${error}` })
  }
})

// Route to get all recipes
app.get('/recipes', (req, res) => {
  log('Getting all recipes')
  try {
    const recipes = recipeStorage.getAllRecipes()
    res.json({ recipes })
  } catch (error) {
    console.error('Error getting recipes:', error)
    res.status(500).send({ error: 'Error getting recipes' })
  }
})

// Route to get a recipe by id
app.get('/recipe/:id', (req, res) => {
  log('Getting recipe:', req.params.id)
  try {
    const recipe = recipeStorage.getRecipeById(req.params.id)
    const similarRecipes = recipeStorage.findRecipesWithSimilarIngredients(req.params.id)
    if (recipe) {
      res.json({ recipe, similarRecipes })
    } else {
      res.status(404).send('Recipe not found')
    }
  } catch (error) {
    console.error('Error getting recipe:', error)
    res.status(500).send('Error getting recipe')
  }
})

// get reciplies with similar ingredients
app.get('/recipe/:id/similarIngredients', (req, res) => {
  log('Getting recipe:', req.params.id)
  try {
    const recipe = recipeStorage.getRecipeById(req.params.id)
    if (recipe) {
      res.json({ recipe })
    } else {
      res.status(404).send('Recipe not found')
    }
  } catch (error) {
    console.error('Error getting recipe:', error)
    res.status(500).send('Error getting recipe')
  }
})

app.post('/recipe/:id', (req, res) => {
  const { id } = req.params
  log('Updating recipe:', id)
  const update = req.body
  try {
    const current = recipeStorage.getRecipeById(id)
    if (!current) {
      res.status(404).send('Recipe not found')
    }
    if (update.ingredients && !current.originalIngredients) {
      update.originalIngredients = JSON.stringify(current.ingredients)
    }
    if (update.directions && !current.originalDirections) {
      update.originalDirections = JSON.stringify(current.directions)
    }
    if (update.notes && !current.originalNotes) {
      update.originalNotes = JSON.stringify(current.notes)
    }
    recipeStorage.updateById(id, update)

    res.json({ recipe: update })
  } catch (error) {
    console.error('Error updating recipe:', error)
    res.status(500).send('Error updating recipe')
  }
})

// Route to delete a recipe by id
app.delete('/recipe/:id', (req, res) => {
  log('Deleting recipe:', req.params.id)
  try {
    recipeStorage.deleteRecipeById(req.params.id)
    res.status(204).send()
  } catch (error) {
    console.error('Error deleting recipe:', error)
    res.status(500).send('Error deleting recipe')
  }
})

app.get('/tags', (req, res) => {
  log('Getting all tags')
  try {
    const tags = recipeStorage.getAllTags()
    res.json({ tags })
  } catch (error) {
    console.error('Error getting tags:', error)
    res.status(500).send({ error: 'Error getting tags' })
  }
})

async function extractRecipeFromText(text) {
  const prompt = `Extract the following information only if the provided text contains a recipe. If no recipe is found, return an empty response.

1. Ingredients (include substitutions, notes, and images **only if provided**. Include preparation details such as diced, cubed, shredded, minced, etc. If ingredients are categorized into groups like "Sauce" or "Frosting," maintain these groupings).
2. Recipe instructions (include photos **only if provided**).
3. Preparation and cooking times.
4. Title and title images.
5. Serving size (if a range is given, always select the larger number).

Strictly use **only** the text from the blog. **Do NOT generate, infer, or modify** any ingredients, instructions, or other recipe details. If no recipe-related content is found in the text, return an empty response.

Input:
${text}`

  log('Prompt:', prompt)
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: {
        type: 'json_schema',
        json_schema: aiOutputFormat,
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 16000,
    })
    const out = response.choices[0].message.content
    if (!out) {
      throw new Error('AI could not extract recipe')
    }
    console.log('AI Output:', out)
    const parsed = JSON.parse(out)
    if (!parsed.ingredients) {
      throw new Error('Not a recipe')
    }
    return parsed
  } catch (error) {
    console.error('Error extracting recipe:', error)
    throw error
  }
}

const PORT = process.env.PORT || 7138
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  log('DEBUG mode is on')
})
