import { describe, expect, test } from '@jest/globals'
import { validatePartialProduct, validateProduct } from './product-schema.js'

describe('product operational schema', () => {
    test('parses operational fields sent by the product form', () => {
        const result = validateProduct({
            name:'Calabaza seleccionada', description:'Materia prima seleccionada', category_id:'1',
            item_type:'raw_material', is_sellable:'1', is_manufacturable:'0', is_customizable:'0',
            production_method:'purchased', production_branch_id:'', channels:'[1,2]',
            personalization_methods:'[]', recipe:'[]'
        })
        expect(result.success).toBe(true)
        expect(result.data).toMatchObject({ item_type:'raw_material', is_sellable:true, is_manufacturable:false, production_branch_id:null, channels:[1,2] })
    })

    test('accepts an editable SKU only on product updates', () => {
        const result = validatePartialProduct({ sku:'MAT-SP', is_sellable:'1' })
        expect(result.success).toBe(true)
        expect(result.data).toEqual({ sku:'MAT-SP', is_sellable:true })
    })
})
