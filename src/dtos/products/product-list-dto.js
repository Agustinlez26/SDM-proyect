export class ProductListDTO {
    constructor(row) {
        this.id = row.id;
        this.name = row.name; 
        this.cod_bar = row.cod_bar;
        this.description = row.description;
        this.category = row.category;
        this.url_img_small = row.url_img_small;
    }
}
