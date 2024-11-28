import axios from 'axios'
import bodyParser from 'body-parser'
import * as cheerio from 'cheerio'
import express from 'express'
import fs from 'fs'
import { OpenAI } from 'openai'
import TurndownService from 'turndown'
import { v4 as uuidv4 } from 'uuid'
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
  apiKey: process.env.README_OPENAI,
})

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
          required: ['amount', 'amountUnit', 'name'],
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
    this.filePath = './recipes.local.json'
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
  }

  getAllRecipes() {
    return this.recipes
  }

  getRecipeById(id) {
    return this.recipes.find((recipe) => recipe.id === id)
  }
}

const recipeStorage = new RecipeStorage()

app.post('/scrape', async (req, res) => {
  const { url } = req.body
  try {
    const response = await axios.get(url)
    const html = response.data
    const $ = cheerio.load(html)
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
    const turndownService = new TurndownService()
    const markdown = turndownService.turndown(body)
    const recipe = await extractRecipeFromText(markdown)
    recipe.sourceUrl = url
    recipeStorage.addRecipe(recipe)
    res.json({ recipe })
  } catch (error) {
    console.error('Error processing HTML:', error)
    res.status(500).send('Error processing HTML')
  }
})

// Route to get all recipes
app.get('/recipes', (req, res) => {
  try {
    const recipes = recipeStorage.getAllRecipes()
    res.json({ recipes })
  } catch (error) {
    console.error('Error getting recipes:', error)
    res.status(500).send('Error getting recipes')
  }
})

// Route to get a recipe by id
app.get('/recipe/:id', (req, res) => {
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

async function extractRecipeFromText(text) {
  const prompt = `Extract\n1. ingredients (substitutions, notes, and images are optional only add them if they are provided and preparation means how to cut or prepare the ingredient for example: diced, cubed, shredded, minced, ...etc)\n2. recipe instructions with photos if they are provided\n3. prep and cooking times\n4. title and title images\n5. Serving size: if there is a range, always pick the larger number\nfrom the following blog. Keep the ingredients and instructions the same, do not modify them. Only use text from the blog, do NOT make up your own.\n\n${text}`
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
    return JSON.parse(out)
  } catch (error) {
    console.error('Error extracting recipe:', error)
    throw error
  }
}

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
