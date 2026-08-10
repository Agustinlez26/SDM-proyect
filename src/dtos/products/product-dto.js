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
    }
}
