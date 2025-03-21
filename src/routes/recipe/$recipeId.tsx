import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { deleteRecipe, getRecipe, getTags, updateRecipe } from '../../services/backend'
import { Ingredient, Recipe } from '../../types'
import './$recipeId.css'

export const Route = createFileRoute('/recipe/$recipeId')({
  loader: async ({ params }) => {
    return {
      recipe: await getRecipe(params.recipeId),
      allTags: await getTags(),
    }
  },
  component: RecipePage,
})

const roundToNearestSixteenth = (value: number) => {
  return Math.round(value * 16) / 16
}

function RecipePage() {
  const {
    recipe: { recipe, similarRecipes },
    allTags,
  } = Route.useLoaderData()
  const navigate = useNavigate()
  const [servings, setServings] = useState(recipe.servings)
  const [editedIngredients, setEditedIngredients] = useState(recipe.ingredients)
  const [editedNotes, setEditedNotes] = useState(recipe.notes || [])
  const [editedDirections, setEditedDirections] = useState(recipe.directions)
  const [editedTags, setEditedTags] = useState(recipe.tags || [])

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isEditingIngredients, setIsEditingIngredients] = useState(false)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isEditingDirections, setIsEditingDirections] = useState(false)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [tags, setTags] = useState<string[]>(allTags || [])

  useEffect(() => {
    setEditedIngredients(recipe.ingredients)
    setEditedNotes(recipe.notes || [])
    setEditedDirections(recipe.directions)
    setEditedTags(recipe.tags || [])
  }, [recipe])

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

  const handleRevert = (key: keyof Recipe) => {
    if (key === 'ingredients') {
      setEditedIngredients(JSON.parse(recipe.originalIngredients || '[]'))
    }
    if (key === 'notes') {
      setEditedNotes(JSON.parse(recipe.originalNotes || '[]'))
    }
    if (key === 'directions') {
      setEditedDirections(JSON.parse(recipe.originalDirections || '[]'))
    }
  }

  const handleCancel = (key: keyof Recipe) => {
    if (key === 'ingredients') {
      setEditedIngredients(recipe.ingredients)
      setIsEditingIngredients(false)
    }
    if (key === 'notes') {
      setEditedNotes(recipe.notes || [])
      setIsEditingNotes(false)
    }
    if (key === 'directions') {
      setEditedDirections(recipe.directions)
      setIsEditingDirections(false)
    }
    if (key === 'tags') {
      setEditedTags(recipe.tags || [])
      setIsEditingTags(false)
    }
  }

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

  const handleDirectionChange = (index: number, name: string, value: string) => {
    setEditedDirections((prev) => prev.map((direction, i) => (i === index ? { ...direction, [name]: value } : direction)))
  }

  const handleAddDirection = () => {
    setEditedDirections((prev) => [...prev, { instruction: '', image: '' }])
  }

  const handleRemoveDirection = (index: number) => {
    setEditedDirections((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTagChange = (index: number, value: string) => {
    setEditedTags((prev) => prev.map((tag, i) => (i === index ? value : tag)))
  }

  const handleNewTagBlur = (index: number, value: string) => {
    handleTagChange(index, value)
    setTags((prev) => [...prev, value])
  }

  const handleAddTag = () => {
    setEditedTags((prev) => [...prev, ''])
  }

  const handleRemoveTag = (index: number) => {
    setEditedTags((prev) => prev.filter((_, i) => i !== index))
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

  const handleCardClick = (recipeId: string) => {
    navigate({ to: `/recipe/${recipeId}` })
  }

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
            if (isEditingIngredients) {
              handleSave({ ingredients: editedIngredients })
            }
            setIsEditingIngredients(!isEditingIngredients)
          }}
          className='edit-button'
        >
          {isEditingIngredients ? 'Save' : 'Edit'}
        </button>

        {isEditingIngredients && (
          <>
            <button onClick={() => handleCancel('ingredients')} className='revert-button'>
              Cancel
            </button>

            {recipe.originalIngredients && (
              <button onClick={() => handleRevert('ingredients')} className='revert-button'>
                Show Original
              </button>
            )}
          </>
        )}
        {Object.keys(groupedIngredients).map((group) => (
          <div key={group}>
            {hasGroups && group !== 'Other' && <h4>{group}</h4>}
            <ul>
              {groupedIngredients[group].map((ingredient, index) => (
                <IngredientLine
                  key={index}
                  ingredient={ingredient}
                  isEditing={isEditingIngredients}
                  onChange={(name, value) => handleIngredientChange(index, name, value)}
                  baseServings={recipe.servings}
                  currentServings={servings}
                />
              ))}
            </ul>
          </div>
        ))}
        <h3>Directions</h3>
        <button
          onClick={() => {
            if (isEditingDirections) {
              handleSave({ directions: editedDirections })
            }
            setIsEditingDirections(!isEditingDirections)
          }}
          className='edit-button'
        >
          {isEditingDirections ? 'Save' : 'Edit'}
        </button>
        {isEditingDirections && (
          <>
            <button onClick={() => handleCancel('directions')} className='revert-button'>
              Cancel
            </button>

            {recipe.originalDirections && (
              <button onClick={() => handleRevert('directions')} className='revert-button'>
                Show Original
              </button>
            )}
          </>
        )}
        <ol>
          {editedDirections.map((direction, index) => (
            <li key={index}>
              {isEditingDirections ? (
                <>
                  <textarea
                    value={direction.instruction}
                    onChange={(e) => handleDirectionChange(index, 'instruction', e.target.value)}
                    placeholder='Instruction'
                    rows={4}
                    cols={50}
                  />
                  <input type='text' value={direction.image} onChange={(e) => handleDirectionChange(index, 'image', e.target.value)} placeholder='Image URL' />
                  <button onClick={() => handleRemoveDirection(index)}>Remove</button>
                </>
              ) : (
                <>
                  {direction.instruction}
                  {direction.image && <img src={direction.image} alt={`Step ${index + 1}`} className='responsive-image' />}
                </>
              )}
            </li>
          ))}
        </ol>
        {isEditingDirections && <button onClick={handleAddDirection}>Add Direction</button>}

        <h3>Notes</h3>
        <button
          onClick={() => {
            if (isEditingNotes) {
              handleSave({ notes: editedNotes })
            } else {
              if (!editedNotes?.length) {
                handleAddNote()
              }
            }
            setIsEditingNotes(!isEditingNotes)
          }}
          className='edit-button'
        >
          {isEditingNotes ? 'Save' : 'Edit'}
        </button>
        {isEditingNotes && (
          <>
            <button onClick={() => handleCancel('notes')} className='revert-button'>
              Cancel
            </button>

            {recipe.originalNotes && (
              <button onClick={() => handleRevert('notes')} className='revert-button'>
                Show Original
              </button>
            )}
          </>
        )}
        <ul>
          {editedNotes.map((note, index) => (
            <li key={index}>
              {isEditingNotes ? (
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
        {isEditingNotes && <button onClick={handleAddNote}>Add Note</button>}

        <h3>Tags</h3>
        <button
          onClick={() => {
            if (isEditingTags) {
              handleSave({ tags: editedTags })
            }
            setIsEditingTags(!isEditingTags)
          }}
          className='edit-button'
        >
          {isEditingTags ? 'Save' : 'Edit'}
        </button>
        {isEditingTags && (
          <button onClick={() => handleCancel('tags')} className='revert-button'>
            Cancel
          </button>
        )}
        <ul>
          {editedTags.map((tag, index) => (
            <li key={index}>
              {isEditingTags ? (
                <>
                  {tag && tag !== 'newValue' ? (
                    tag
                  ) : (
                    <select value={tag} onChange={(e) => handleTagChange(index, e.target.value)}>
                      <option value=''>Select a tag</option>
                      {tags
                        .filter((t) => !editedTags.includes(t))
                        .map((t, i) => (
                          <option key={i} value={t}>
                            {t}
                          </option>
                        ))}
                      <option value='newValue'>Add new tag</option>
                    </select>
                  )}
                  {tag === 'newValue' && <input type='text' placeholder='New tag' onBlur={(e) => handleNewTagBlur(index, e.target.value)} />}
                  <button onClick={() => handleRemoveTag(index)}>Remove</button>
                </>
              ) : (
                tag
              )}
            </li>
          ))}
        </ul>
        {isEditingTags && <button onClick={handleAddTag}>Add Tag</button>}

        <p>
          Source:{' '}
          <a href={recipe.sourceUrl} target='_blank' rel='noopener noreferrer'>
            {recipe.sourceUrl}
          </a>
        </p>
        <h3>Similar Recipes</h3>
        <div className='similar-recipes-container'>
          {similarRecipes.map((similarRecipe) => (
            <div key={similarRecipe.id} className='similar-recipe-card' onClick={() => handleCardClick(similarRecipe.id)}>
              <h4>{similarRecipe.title}</h4>
              {similarRecipe.mainImage && <img src={similarRecipe.mainImage} alt={similarRecipe.title} className='responsive-image' />}
              <p>Matching Ingredients: {similarRecipe.similarIngredients.join(', ')}</p>
            </div>
          ))}
        </div>
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
