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

    test('requires a sales channel for sellable products', () => {
        const result = validateProduct({
            name:'Campera Juncal', description:'Indumentaria para venta', category_id:'1',
            item_type:'finished', is_sellable:'1', is_manufacturable:'0', is_customizable:'0',
            production_method:'purchased', production_branch_id:'', channels:'[]',
            personalization_methods:'[]', recipe:'[]'
        })
        expect(result.success).toBe(false)
        expect(result.error.issues[0].path).toEqual(['channels'])
    })

    test('allows raw materials with no sales channel when they are not sellable', () => {
        const result = validateProduct({
            name:'Base cuero crudo', description:'Insumo para produccion', category_id:'1',
            item_type:'raw_material', is_sellable:'0', is_manufacturable:'0', is_customizable:'0',
            production_method:'purchased', production_branch_id:'', channels:'[]',
            personalization_methods:'[]', recipe:'[]'
        })
        expect(result.success).toBe(true)
    })
})
