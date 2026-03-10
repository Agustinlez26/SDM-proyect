export class BranchPerformanceDTO {
    constructor(data){
        this.branch_name = data.branch_name
        this.month = data.month
        this.total_items_sold = data.total_items_sold
    }
}
