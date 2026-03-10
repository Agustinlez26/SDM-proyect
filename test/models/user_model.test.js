import { jest } from '@jest/globals';
import { UserModel } from '../../src/models/user.js';
import { User_list_DTO } from '../../src/dtos/users/User_list_DTO.js';
import { User_DTO } from '../../src/dtos/users/User_DTO.js';

describe('User Model', () => {
    let userModel;
    let mockDb;

    beforeEach(() => {
        // 1. Mock de la DB
        mockDb = {
            query: jest.fn()
        };

        // 2. Inyección de Dependencias CORREGIDA
        // Tu modelo espera un objeto { db }, no el mock directo.
        userModel = new UserModel({ db: mockDb });
        
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('debe retornar una lista de usuarios sin filtros', async () => {
            // Arrange
            // Simulamos datos crudos de la DB
            const mockRows = [{ id: 'uuid-1', full_name: 'Juan', branch: 'Centro', is_admin: 0, is_active: 1 }];
            mockDb.query.mockResolvedValue([mockRows]);

            // Act
            const result = await userModel.findAll({});

            // Assert
            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'), 
                expect.any(Array)
            );
            expect(mockDb.query.mock.calls[0][1]).toHaveLength(0); // Sin params extra
            
            // Verificamos que devuelve instancias de DTO reales
            expect(result[0]).toBeInstanceOf(User_list_DTO);
            expect(result[0].full_name).toBe('Juan');
        });

        it('debe aplicar filtros de búsqueda y rol correctamente', async () => {
            // Arrange
            mockDb.query.mockResolvedValue([[]]); 

            // Act
            await userModel.findAll({ 
                search: 'Carlos', 
                filters: { is_admin: 1 } 
            });

            // Assert
            const [sql, params] = mockDb.query.mock.calls[0];
            
            expect(sql).toContain('LIKE ?');
            expect(sql).toContain('is_admin = ?');
            expect(params).toEqual(['%Carlos%', '%Carlos%', '%Carlos%', 1]);
        });
    });

    describe('findById', () => {
        it('debe retornar null si no encuentra el usuario', async () => {
            mockDb.query.mockResolvedValue([[]]); // Array vacío

            const result = await userModel.findById('uuid-inexistente');

            expect(result).toBeNull();
        });

        it('debe retornar un User_DTO si encuentra el usuario', async () => {
            const mockRow = { id: 'uuid-real', full_name: 'Pepe', email: 'a@a.com' };
            mockDb.query.mockResolvedValue([[mockRow]]);

            const result = await userModel.findById('uuid-real');

            expect(result).toBeInstanceOf(User_DTO);
            expect(result.full_name).toBe('Pepe');
        });
    });

    describe('create', () => {
        it('debe insertar usuario y retornar el nuevo UUID', async () => {
            mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);

            const userData = {
                full_name: 'Nuevo User',
                email: 'test@test.com',
                password: 'hash',
                is_admin: 0,
                branch_id: 1,
                is_active: 1,
                requires_password_change: 1
            };

            const newId = await userModel.create(userData);

            expect(typeof newId).toBe('string');
            expect(newId.length).toBeGreaterThan(10); // Es un UUID

            expect(mockDb.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO users'),
                expect.arrayContaining(['test@test.com'])
            );
        });
    });

    describe('update', () => {
        it('debe ignorar campos no permitidos (Mass Assignment Protection)', async () => {
            const result = await userModel.update('uuid-1', { 
                id: 'hacker-id', 
                password: 'new-pass' // Campo no permitido en update simple
            });

            expect(mockDb.query).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('debe actualizar campos permitidos correctamente', async () => {
            mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);

            const result = await userModel.update('uuid-1', { 
                full_name: 'Nombre Actualizado' 
            });

            const [sql, params] = mockDb.query.mock.calls[0];

            expect(sql).toContain('UPDATE users SET full_name = ?');
            expect(params).toEqual(['Nombre Actualizado', 'uuid-1']);
            expect(result).toBe(true);
        });
    });

    describe('changePassword', () => {
        it('debe actualizar solo password si no es firstLogin', async () => {
            mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);

            await userModel.changePassword('uuid-1', 'new-hash', false);

            const [sql] = mockDb.query.mock.calls[0];
            expect(sql).not.toContain('requires_password_change');
        });

        it('debe desactivar el flag requires_password_change si es firstLogin', async () => {
            mockDb.query.mockResolvedValue([{ affectedRows: 1 }]);

            await userModel.changePassword('uuid-1', 'new-hash', true);

            const [sql, params] = mockDb.query.mock.calls[0];
            
            expect(sql).toContain('requires_password_change = ?');
            expect(params[1]).toBe(0); 
        });
    });
});