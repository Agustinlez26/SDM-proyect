import { describe, expect, jest, test } from '@jest/globals'
import { MovementService } from './movement-service.js'

const buildService = movement => {
    const movementModel = {
        findById: jest.fn(async () => movement),
        findDetails: jest.fn(async () => [{ product:{ id:4 }, quantity:2 }]),
        dispatchShipment: jest.fn(async () => undefined),
        receiveShipment: jest.fn(async () => undefined)
    }
    return {
        movementModel,
        service: new MovementService({ movementModel, branchModel:{}, stockModel:{} })
    }
}

describe('shipment state permissions', () => {
    test('requires final receipt confirmation from the destination branch', async () => {
        const { service, movementModel } = buildService({
            id:12, type:'envio', status:'en_proceso', origin_branch_id:2, destination_branch_id:1
        })

        await expect(service.changeStatusShipment(12, {
            id:'admin', is_admin:true, app_role:'admin', branch_id:2
        })).rejects.toThrow('La llegada debe confirmarla un usuario de la sucursal destino')
        expect(movementModel.receiveShipment).not.toHaveBeenCalled()
    })

    test('allows a user assigned to the destination branch to receive it', async () => {
        const { service, movementModel } = buildService({
            id:12, type:'envio', status:'en_proceso', origin_branch_id:2, destination_branch_id:1
        })

        await expect(service.changeStatusShipment(12, {
            id:'manager', is_admin:false, app_role:'stock_manager', branch_id:1
        })).resolves.toEqual({ message:'Envío recibido y stock actualizado en destino' })
        expect(movementModel.receiveShipment).toHaveBeenCalledWith(12, expect.any(Array))
    })
})
