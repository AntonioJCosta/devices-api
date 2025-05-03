import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deviceService } from '../src/services/deviceService'
import { devices, type Device } from '../drizzle/schema'
import { eq } from 'drizzle-orm'

// Mock the config/env module
vi.mock('../src/config/env', () => ({
    env: {
        DB_URL: 'postgresql://testuser:testpass@localhost:5432/testdb',
        APP_PORT: 3001,
        APP_HOST: 'localhost',
        LOG_LEVEL: 'info',
    },
    NODE_ENV: process.env.NODE_ENV || 'test',
}));


vi.mock('../src/db/client', () => {
    const mockReturning = vi.fn();
    const mockWhere = vi.fn(); // Mock for the .where() method call itself
    const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) });
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockDeleteWhere = vi.fn();
    const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });

    // This object needs to be awaitable AND have a .where method
    const mockQueryBuilder = {
        where: mockWhere,
        // Add a 'then' method to make it awaitable. It will resolve with the value we set later.
        then: vi.fn((resolve, reject) => resolve([]))
    };
    const mockFrom = vi.fn().mockReturnValue(mockQueryBuilder);

    const mockDb = {
        insert: vi.fn().mockReturnValue({ values: mockValues }),
        select: vi.fn().mockReturnValue({ from: mockFrom }),
        update: vi.fn().mockReturnValue({ set: mockSet }),
        delete: mockDelete,
        _returningMock: mockReturning,
        _whereMock: mockWhere,
        _deleteWhereMock: mockDeleteWhere,
        _mockQueryBuilderThen: mockQueryBuilder.then
    };

    return { db: mockDb };
});

// Mock drizzle-orm functions used
vi.mock('drizzle-orm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('drizzle-orm')>();
    return {
        ...actual,
        eq: vi.fn((field, value) => ({ type: 'eq', field: field?.name ?? String(field), value })),
        and: vi.fn((...args) => ({ type: 'and', conditions: args })),
    };
});

const { db } = await import('../src/db/client');
const mockedDbWhere = (db as any)._whereMock;
const mockedDbReturning = (db as any)._returningMock;
const mockedDbDeleteWhere = (db as any)._deleteWhereMock;
const mockedQueryBuilderThen = (db as any)._mockQueryBuilderThen;


describe('Device Service', () => {
    const mockDeviceAvaliable: Device = {
        id: 1,
        name: 'Test Device',
        brand: 'Samsung',
        state: 'available',
        createdAt: new Date(),
    };
    const mockDeviceInUse: Device = {
        id: 2,
        name: 'In-Use Device',
        brand: 'Samsung',
        state: 'in-use',
        createdAt: new Date(),
    };


    beforeEach(() => {
        vi.clearAllMocks();

        mockedDbWhere.mockResolvedValue([mockDeviceAvaliable, mockDeviceInUse]);
        mockedDbReturning.mockResolvedValue([mockDeviceAvaliable, mockDeviceInUse]);
        mockedDbDeleteWhere.mockResolvedValue({ count: 1 });



    });

    describe('createDevice', () => {

        it('should throw error if db.insert fails (returns empty array)', async () => {
            const inputData = { name: 'Fail Device', brand: 'Apple' as const, state: 'available' as const };
            mockedDbReturning.mockResolvedValueOnce([]);
            await expect(deviceService.createDevice(inputData)).rejects.toThrow("Device name 'Fail Device' already exists.");
        });
    });

    describe('getAllDevices', () => {
        it('should call db.select without where when no filters are provided', async () => {
            const mockResult = [mockDeviceAvaliable, mockDeviceInUse];
            mockedQueryBuilderThen.mockImplementationOnce((resolve: (value: Device[]) => void) => resolve(mockResult));

            const result = await deviceService.getAllDevices({});

            expect(db.select).toHaveBeenCalled();
            expect(db.select().from).toHaveBeenCalledWith(devices);
            expect(mockedDbWhere).not.toHaveBeenCalled();
            expect(result).toEqual(mockResult);
        });

        it('should call db.select with brand and state filters using AND', async () => {
            const brand = 'Test Brand';
            const state = 'available';
            const mockResult = [mockDeviceAvaliable];
            // Configure the 'then' mock for this specific case to return the filtered result
            mockedQueryBuilderThen.mockImplementationOnce((resolve: (value: Device[]) => void) => resolve(mockResult));

            const result = await deviceService.getAllDevices({ brand, state });

            expect(db.select).toHaveBeenCalled();
            expect(db.select().from).toHaveBeenCalledWith(devices);
            // Check that the where mock was called on the builder object
            expect(mockedDbWhere).toHaveBeenCalledWith(expect.objectContaining({ type: 'and' }));
            // Check that eq was called for both filters
            expect(eq).toHaveBeenCalledWith(devices.brand, brand);
            expect(eq).toHaveBeenCalledWith(devices.state, state);
            // Check that the final awaited result is correct
            expect(result).toEqual(mockResult);
        });
    });

    describe('getDeviceById', () => {
        it('should call db.select with correct ID and return device if found', async () => {
            const {id} = mockDeviceAvaliable;
            const result = await deviceService.getDeviceById(id);

            expect(db.select).toHaveBeenCalled();
            expect(mockedDbWhere).toHaveBeenCalledWith(expect.objectContaining({ type: 'eq', field: 'id', value: id }));
            expect(result).toEqual(mockDeviceAvaliable);
        });

        it('should return undefined if device not found', async () => {
            const id = 999;
            // Override the default mock for this specific case
            mockedDbWhere.mockResolvedValueOnce([]); // Simulate not found by returning []

            const result = await deviceService.getDeviceById(id);

            expect(db.select).toHaveBeenCalled();
            expect(mockedDbWhere).toHaveBeenCalledWith(expect.objectContaining({ type: 'eq', field: 'id', value: id }));
            expect(result).toBeUndefined();
        });
    });

    describe('updateDevice', () => {

        // Domain Validation: Name property cannot be updated if the device is in-use

        it('should throw error if name is updated for an in-use device', async () => {
            const {id} = mockDeviceInUse;
            const updateData = { name: 'Updated Name' };
            vi.spyOn(deviceService, 'getDeviceById').mockResolvedValueOnce(mockDeviceInUse);

            await expect(deviceService.updateDevice(id, updateData)).rejects.toThrow("Cannot update name for a device that is 'in-use'");
        });

        // Domain Validation: Brand property cannot be updated if the device is in-use

        it('should throw error if brand is updated for an in-use device', async () => {
            const {id} = mockDeviceInUse;
            const updateData = { brand: 'Sony' as const};
            vi.spyOn(deviceService, 'getDeviceById').mockResolvedValueOnce(mockDeviceInUse);

            await expect(deviceService.updateDevice(id, updateData)).rejects.toThrow("Cannot update brand for a device that is 'in-use'");
        });

        // Domain Validation: Creation time cannot be updated
        it('should throw error if createdAt is updated', async () => {
            const {id} = mockDeviceAvaliable;
            const updateData: Partial<Device> = { createdAt: new Date() };
            vi.spyOn(deviceService, 'getDeviceById').mockResolvedValueOnce(mockDeviceAvaliable);

            await expect(deviceService.updateDevice(id, updateData)).rejects.toThrow('Cannot update createdAt property');
        }
        );
    });

    describe('deleteDevice', () => {
        // Domain Validation: Device cannot be deleted if it is in-use
        it('should throw error if device is in-use', async () => {
            const {id} = mockDeviceInUse;
            vi.spyOn(deviceService, 'getDeviceById').mockResolvedValueOnce(mockDeviceInUse);
            await expect(deviceService.deleteDevice(id)).rejects.toThrow("Cannot delete a device that is 'in-use'");
        });


        it('should delete an available device successfully and return true', async () => {
            const {id} = mockDeviceAvaliable;
            vi.spyOn(deviceService, 'getDeviceById').mockResolvedValueOnce(mockDeviceAvaliable);
            // Explicitly set mock using count
            mockedDbDeleteWhere.mockResolvedValueOnce({ count: 1 }); // Changed from rowCount

            const result = await deviceService.deleteDevice(id);

            expect(db.delete).toHaveBeenCalledWith(devices);
            expect(mockedDbDeleteWhere).toHaveBeenCalledWith(expect.objectContaining({ type: 'eq', field: 'id', value: id }));
            expect(result).toBe(true);
        });

        it('should return false if delete operation affects 0 rows', async () => {
            const {id} = mockDeviceAvaliable;
            vi.spyOn(deviceService, 'getDeviceById').mockResolvedValueOnce(mockDeviceAvaliable);
            // Override delete mock to simulate 0 rows affected using count
            mockedDbDeleteWhere.mockResolvedValueOnce({ count: 0 }); // Changed from rowCount

            const result = await deviceService.deleteDevice(id);
            expect(result).toBe(false);

        });

    it('should return false if delete operation affects 0 rows', async () => {
        const {id} = mockDeviceAvaliable;
        vi.spyOn(deviceService, 'getDeviceById').mockResolvedValueOnce(mockDeviceAvaliable);
        // Override delete mock to simulate 0 rows affected
        mockedDbDeleteWhere.mockResolvedValueOnce({ rowCount: 0 });

        const result = await deviceService.deleteDevice(id);
        expect(result).toBe(false);

    });
});
});