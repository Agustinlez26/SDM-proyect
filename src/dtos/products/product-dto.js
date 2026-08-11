export class ProductDTO {
    constructor(row) {
        this.id = row.id;
        this.name = row.name;
        this.sku = row.sku;
        this.description = row.description;
        this.category_id = row.category_id;
        this.category = row.category;
        this.url_img_original = row.url_img_original;
        this.is_active = Boolean(row.is_active);
        this.item_type = row.item_type;
        this.is_sellable = Boolean(row.is_sellable);
        this.is_manufacturable = Boolean(row.is_manufacturable);
        this.is_customizable = Boolean(row.is_customizable);
        this.production_method = row.production_method;
        this.production_branch_id = row.production_branch_id;
        this.channels = row.channels || [];
        this.recipe = row.recipe || [];
        this.personalization_methods = row.personalization_methods || [];
    }
}
