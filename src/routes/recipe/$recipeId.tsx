import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { deleteRecipe, getRecipe, updateRecipe } from '../../services/backend'
import { Ingredient, Recipe } from '../../types'
import './$recipeId.css'

export const Route = createFileRoute('/recipe/$recipeId')({
  loader: async ({ params }) => {
    return getRecipe(params.recipeId)
  },
  component: RecipePage,
})

const roundToNearestSixteenth = (value: number) => {
  return Math.round(value * 16) / 16
}

function RecipePage() {
  const recipe = Route.useLoaderData()
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [servings, setServings] = useState(recipe.servings)
  const [isEditing, setIsEditing] = useState(false)
  const [editedIngredients, setEditedIngredients] = useState(recipe.ingredients)
  const [editedNotes, setEditedNotes] = useState(recipe.notes || [])

  const handleDelete = useCallback(
    async (recipeId: string) => {
      try {
        await deleteRecipe(recipeId)
        navigate({ to: `/` })
      } catch (error) {
        // Handle error
        console.error('Failed to delete the recipe', error)
        alert('Failed to delete the recipe')
      }
    },
    [navigate]
  )

  const handleDeleteClick = () => {
    if (confirmDelete) {
      handleDelete(recipe.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  const handleServingsChange = (delta: number) => {
    setServings((prevServings) => Math.max(1, prevServings + delta))
  }

  const handleSave = useCallback(
    async (update: Partial<Recipe>) => {
      try {
        await updateRecipe(recipe.id, update)
      } catch (error) {
        console.error('Failed to save recipe', error)
        alert('Failed to save recipe, please try again later')
      }
    },
    [recipe.id]
  )

  const handleIngredientChange = (index: number, name: string, value: string | number) => {
    setEditedIngredients((prev) => prev.map((ingredient, i) => (i === index ? { ...ingredient, [name]: value } : ingredient)))
  }

  const handleNoteChange = (index: number, value: string) => {
    setEditedNotes((prev) => prev.map((note, i) => (i === index ? value : note)))
  }

  const handleAddNote = () => {
    setEditedNotes((prev) => [...prev, ''])
  }

  const handleRemoveNote = (index: number) => {
    setEditedNotes((prev) => prev.filter((_, i) => i !== index))
  }

  const hasGroups = editedIngredients.some((ingredient) => ingredient.group)
  const groupedIngredients = hasGroups
    ? editedIngredients.reduce(
        (acc, ingredient) => {
          const group = ingredient.group || 'Other'
          if (!acc[group]) {
            acc[group] = []
          }
          acc[group].push(ingredient)
          return acc
        },
        {} as Record<string, Ingredient[]>
      )
    : { Other: editedIngredients }

  return (
    <div className='recipe-page-container'>
      <div className='recipe-page'>
        <h2>{recipe.title}</h2>
        <p>
          Prep Time: {recipe.prepTime} {recipe.prepTimeUnit}
        </p>
        <p>
          Cook Time: {recipe.cookTime} {recipe.cookTimeUnit}
        </p>
        <p>
          Total Time: {recipe.totalTime} {recipe.totalTimeUnit}
        </p>
        <p>
          Servings:
          <button disabled={servings === 1} onClick={() => handleServingsChange(-1)} className='servings-button'>
            -
          </button>
          <span className={`servings-count ${servings !== recipe.servings ? 'modified' : ''}`}>{servings}</span>
          <button onClick={() => handleServingsChange(1)} className='servings-button'>
            +
          </button>
        </p>
        {recipe.mainImage && <img src={recipe.mainImage} alt={recipe.title} className='responsive-image' />}
        <h3>Ingredients</h3>
        <button
          onClick={() => {
            if (isEditing) {
              handleSave({ ingredients: editedIngredients })
            }
            setIsEditing(!isEditing)
          }}
          className='edit-button'
        >
          {isEditing ? 'Done' : 'Edit'}
        </button>
        {Object.keys(groupedIngredients).map((group) => (
          <div key={group}>
            {hasGroups && group !== 'Other' && <h4>{group}</h4>}
            <ul>
              {groupedIngredients[group].map((ingredient, index) => (
                <IngredientLine
                  key={index}
                  ingredient={ingredient}
                  isEditing={isEditing}
                  onChange={(name, value) => handleIngredientChange(index, name, value)}
                  baseServings={recipe.servings}
                  currentServings={servings}
                />
              ))}
            </ul>
          </div>
        ))}
        <h3>Directions</h3>
        <ol>
          {recipe.directions.map((direction, index) => (
            <li key={index}>
              {direction.instruction}
              {direction.image && <img src={direction.image} alt={`Step ${index + 1}`} className='responsive-image' />}
            </li>
          ))}
        </ol>
        {recipe.notes?.length && recipe.notes.length > 0 ? (
          <>
            <h3>Notes</h3>
            <button
              onClick={() => {
                if (isEditing) {
                  handleSave({ notes: editedNotes })
                }
                setIsEditing(!isEditing)
              }}
              className='edit-button'
            >
              {isEditing ? 'Done' : 'Edit'}
            </button>
            <ul>
              {editedNotes.map((note, index) => (
                <li key={index}>
                  {isEditing ? (
                    <>
                      <textarea value={note} onChange={(e) => handleNoteChange(index, e.target.value)} placeholder='Note' rows={4} cols={50} />
                      <button onClick={() => handleRemoveNote(index)}>Remove</button>
                    </>
                  ) : (
                    note
                  )}
                </li>
              ))}
            </ul>
            {isEditing && <button onClick={handleAddNote}>Add Note</button>}
          </>
        ) : null}

        <p>
          Source:{' '}
          <a href={recipe.sourceUrl} target='_blank' rel='noopener noreferrer'>
            {recipe.sourceUrl}
          </a>
        </p>
        <button className='delete-button' onClick={handleDeleteClick}>
          {confirmDelete ? 'Really Delete?' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function IngredientLine({
  ingredient,
  isEditing,
  onChange,
  baseServings,
  currentServings,
}: {
  ingredient: Ingredient
  isEditing: boolean
  baseServings: number
  currentServings: number
  onChange: (name: string, value: string | number) => void
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    onChange(name, value)
  }
  const amount = roundToNearestSixteenth((ingredient.amount * currentServings) / baseServings)
  return (
    <li>
      {isEditing ? (
        <>
          <input type='number' name='amount' value={ingredient.amount} onChange={handleChange} placeholder='Amount' />
          <input type='text' name='amountUnit' value={ingredient.amountUnit} onChange={handleChange} placeholder='Unit' />
          <input type='text' name='name' value={ingredient.name} onChange={handleChange} placeholder='Name' />
          <input type='text' name='preparation' value={ingredient.preparation} onChange={handleChange} placeholder='Preparation' />
          <input type='text' name='notes' value={ingredient.notes} onChange={handleChange} placeholder='Notes' />
        </>
      ) : (
        <>
          {amount} {ingredient.amountUnit} {ingredient.name} {ingredient.preparation && `(${ingredient.preparation})`}
          {ingredient.notes && ` - ${ingredient.notes}`}
        </>
      )}
    </li>
  )
}

export default RecipePage
