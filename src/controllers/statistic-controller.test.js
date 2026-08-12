import { describe, expect, jest, test } from '@jest/globals'
import { StatisticController } from './statistic-controller.js'

const responseMock = () => {
    const response = {}
    response.status = jest.fn(() => response)
    response.json = jest.fn(() => response)
    return response
}

describe('StatisticController top selling filters', () => {
    test('passes year, channel and branch filters to the service', async () => {
        const data = [{ product_name:'Mate SP', total_quantity:12 }]
        const statisticService = { getTopSellingProducts:jest.fn(async () => data) }
        const controller = new StatisticController({ statisticService })
        const response = responseMock()

        await controller.getTopSellingProducts({ query:{ year:'2026', channel:'showroom', branch_id:'2' } }, response)

        expect(statisticService.getTopSellingProducts).toHaveBeenCalledWith({ year:2026, channel:'showroom', branchId:2 })
        expect(response.json).toHaveBeenCalledWith({ status:'success', data })
    })

    test('rejects an unsupported sales channel', async () => {
        const statisticService = { getTopSellingProducts:jest.fn() }
        const controller = new StatisticController({ statisticService })
        const response = responseMock()

        await controller.getTopSellingProducts({ query:{ channel:'otro' } }, response)

        expect(response.status).toHaveBeenCalledWith(400)
        expect(statisticService.getTopSellingProducts).not.toHaveBeenCalled()
    })
})
