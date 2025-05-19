import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { deleteRecipe, getRecipe, updateRecipe } from '../../services/backend'
import { Ingredient, Recipe } from '../../types'
import './$recipeId.css'

export const Route = createFileRoute('/recipe/$recipeId')({
  loader: async ({ params }) => {
    return {
      recipe: await getRecipe(params.recipeId),
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
    <div className='recipe-container'>
      <div className='recipe-content'>
        <div className='recipe-card'>
          <div className='recipe-header'>
            <div>
              <h2 className='recipe-title'>{recipe.title}</h2>
              <div className='recipe-meta'>
                <p>
                  Prep Time: {recipe.prepTime} {recipe.prepTimeUnit}
                </p>
                <p>
                  Cook Time: {recipe.cookTime} {recipe.cookTimeUnit}
                </p>
                <p>
                  Total Time: {recipe.totalTime} {recipe.totalTimeUnit}
                </p>
              </div>
            </div>
            <div className='servings-control'>
              <button disabled={servings === 1} onClick={() => handleServingsChange(-1)} className='servings-button'>
                -
              </button>
              <span className={`servings-count ${servings !== recipe.servings ? 'modified' : ''}`}>{servings}</span>
              <button onClick={() => handleServingsChange(1)} className='servings-button'>
                +
              </button>
            </div>
          </div>

          {recipe.mainImage && (
            <div className='section'>
              <img src={recipe.mainImage} alt={recipe.title} className='recipe-image' />
            </div>
          )}

          <div className='section'>
            <div className='section-header'>
              <h3 className='section-title'>Ingredients</h3>
              <div className='button-group'>
                <button
                  onClick={() => {
                    if (isEditingIngredients) {
                      handleSave({ ingredients: editedIngredients })
                    }
                    setIsEditingIngredients(!isEditingIngredients)
                  }}
                  className='button button-primary'
                >
                  {isEditingIngredients ? 'Save' : 'Edit'}
                </button>

                {isEditingIngredients && (
                  <>
                    <button onClick={() => handleCancel('ingredients')} className='button button-secondary'>
                      Cancel
                    </button>

                    {recipe.originalIngredients && (
                      <button onClick={() => handleRevert('ingredients')} className='button button-secondary'>
                        Show Original
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className='ingredients-list'>
              {Object.keys(groupedIngredients).map((group) => (
                <div key={group} className='ingredient-group'>
                  {hasGroups && group !== 'Other' && <h4 className='ingredient-group-title'>{group}</h4>}
                  <ul className='ingredient-items'>
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
            </div>
          </div>

          <div className='section'>
            <div className='section-header'>
              <h3 className='section-title'>Directions</h3>
              <div className='button-group'>
                <button
                  onClick={() => {
                    if (isEditingDirections) {
                      handleSave({ directions: editedDirections })
                    }
                    setIsEditingDirections(!isEditingDirections)
                  }}
                  className='button button-primary'
                >
                  {isEditingDirections ? 'Save' : 'Edit'}
                </button>

                {isEditingDirections && (
                  <>
                    <button onClick={() => handleCancel('directions')} className='button button-secondary'>
                      Cancel
                    </button>

                    {recipe.originalDirections && (
                      <button onClick={() => handleRevert('directions')} className='button button-secondary'>
                        Show Original
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className='directions-list'>
              {editedDirections.map((direction, index) => (
                <div key={index} className='direction-item'>
                  <div className='direction-number'>{index + 1}</div>
                  <div className='direction-content'>
                    {isEditingDirections ? (
                      <div className='space-y-2'>
                        <textarea
                          value={direction.instruction}
                          onChange={(e) => handleDirectionChange(index, 'instruction', e.target.value)}
                          className='ingredient-input'
                          rows={3}
                        />
                        <input
                          type='text'
                          value={direction.image}
                          onChange={(e) => handleDirectionChange(index, 'image', e.target.value)}
                          placeholder='Image URL (optional)'
                          className='ingredient-input'
                        />
                        <button onClick={() => handleRemoveDirection(index)} className='button button-danger'>
                          Remove Step
                        </button>
                      </div>
                    ) : (
                      <div className='space-y-2'>
                        <p className='direction-text'>{direction.instruction}</p>
                        {direction.image && <img src={direction.image} alt={`Step ${index + 1}`} className='direction-image' />}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isEditingDirections && (
                <button onClick={handleAddDirection} className='button button-primary'>
                  Add Step
                </button>
              )}
            </div>
          </div>

          <div className='section'>
            <div className='section-header'>
              <h3 className='section-title'>Notes</h3>
              <div className='button-group'>
                <button
                  onClick={() => {
                    if (isEditingNotes) {
                      handleSave({ notes: editedNotes })
                    }
                    setIsEditingNotes(!isEditingNotes)
                  }}
                  className='button button-primary'
                >
                  {isEditingNotes ? 'Save' : 'Edit'}
                </button>

                {isEditingNotes && (
                  <>
                    <button onClick={() => handleCancel('notes')} className='button button-secondary'>
                      Cancel
                    </button>

                    {recipe.originalNotes && (
                      <button onClick={() => handleRevert('notes')} className='button button-secondary'>
                        Show Original
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className='notes-list'>
              {isEditingNotes ? (
                <>
                  {editedNotes.map((note, index) => (
                    <div key={index} className='ingredient-item'>
                      <textarea value={note} onChange={(e) => handleNoteChange(index, e.target.value)} className='ingredient-input' rows={2} />
                      <button onClick={() => handleRemoveNote(index)} className='button button-danger'>
                        <svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                          <path
                            fillRule='evenodd'
                            d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddNote} className='button button-primary'>
                    Add Note
                  </button>
                </>
              ) : (
                <ul className='notes-list'>
                  {editedNotes.map((note, index) => (
                    <li key={index} className='note-item'>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className='section'>
            <div className='section-header'>
              <h3 className='section-title'>Tags</h3>
              <div className='button-group'>
                <button
                  onClick={() => {
                    if (isEditingTags) {
                      handleSave({ tags: editedTags })
                    }
                    setIsEditingTags(!isEditingTags)
                  }}
                  className='button button-primary'
                >
                  {isEditingTags ? 'Save' : 'Edit'}
                </button>

                {isEditingTags && (
                  <button onClick={() => handleCancel('tags')} className='button button-secondary'>
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className='tags-container'>
              {isEditingTags ? (
                <div className='space-y-2'>
                  {editedTags.map((tag, index) => (
                    <div key={index} className='ingredient-item'>
                      <input
                        type='text'
                        value={tag}
                        onChange={(e) => handleTagChange(index, e.target.value)}
                        onBlur={(e) => handleNewTagBlur(index, e.target.value)}
                        className='ingredient-input'
                      />
                      <button onClick={() => handleRemoveTag(index)} className='button button-danger'>
                        <svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
                          <path
                            fillRule='evenodd'
                            d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <button onClick={handleAddTag} className='button button-primary'>
                    Add Tag
                  </button>
                </div>
              ) : (
                <div className='tags-list'>
                  {editedTags.map((tag, index) => (
                    <span key={index} className='tag'>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className='delete-section'>
            <button onClick={handleDeleteClick} className={`delete-button ${confirmDelete ? 'confirm' : ''}`}>
              {confirmDelete ? 'Click again to confirm delete' : 'Delete Recipe'}
            </button>
          </div>
        </div>

        {similarRecipes && similarRecipes.length > 0 && (
          <div className='similar-recipes'>
            <h3 className='similar-recipes-title'>Similar Recipes</h3>
            <div className='similar-recipes-grid'>
              {similarRecipes.map((recipe) => (
                <div key={recipe.id} onClick={() => handleCardClick(recipe.id)} className='similar-recipe-card'>
                  <div className='similar-recipe-content'>
                    <div className='similar-recipe-header'>
                      <div className='similar-recipe-body'>
                        {recipe.mainImage && <img src={recipe.mainImage} alt={recipe.title} className='similar-recipe-image' />}
                        <div className='similar-recipe-info'>
                          <h3 className='similar-recipe-title'>{recipe.title}</h3>
                          {recipe.tags && (
                            <div className='similar-recipe-tags'>
                              {recipe.tags.map((tag, index) => (
                                <span key={index} className='tag'>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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

  const scaledAmount = ingredient.amount ? roundToNearestSixteenth((ingredient.amount * currentServings) / baseServings) : null

  return (
    <li className='ingredient-item'>
      {isEditing ? (
        <>
          <input type='number' name='amount' value={ingredient.amount || ''} onChange={handleChange} className='ingredient-input' />
          <input type='text' name='amountUnit' value={ingredient.amountUnit || ''} onChange={handleChange} placeholder='unit' className='ingredient-input' />
          <input type='text' name='name' value={ingredient.name} onChange={handleChange} className='ingredient-input' />
          <input type='text' name='group' value={ingredient.group || ''} onChange={handleChange} placeholder='group (optional)' className='ingredient-input' />
        </>
      ) : (
        <span className='ingredient-text'>
          {scaledAmount !== null && `${scaledAmount} `}
          {ingredient.amountUnit && `${ingredient.amountUnit} `}
          {ingredient.name}
          {ingredient.preparation && ` (${ingredient.preparation})`}
          {ingredient.notes && ` - ${ingredient.notes}`}
        </span>
      )}
    </li>
  )
}

export default RecipePage
