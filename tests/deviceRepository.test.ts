import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deviceService } from '../src/services/deviceService'
import { devices, type Device } from '../drizzle/schema'
import { deviceRepository } from '../src/repositories/deviceRepository'

vi.mock('../src/config/env', () => ({
    env: {
        DB_URL: 'postgresql://testuser:testpass@localhost:5432/testdb',
        APP_PORT: 3001,
        APP_HOST: 'localhost',
        LOG_LEVEL: 'info',
    },
    NODE_ENV: process.env.NODE_ENV || 'test',
}));

vi.mock('../src/repositories/deviceRepository', () => ({
    deviceRepository: {
        findById: vi.fn(),
        findByName: vi.fn(),
        findAll: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    }
}));


// --- Test Data ---
const mockDeviceAvailable: Device = {
    id: 1,
    name: 'Available Device',
    brand: 'Samsung',
    state: 'available',
    createdAt: new Date(),
};
const mockDeviceInUse: Device = {
    id: 2,
    name: 'In-Use Device',
    brand: 'Apple',
    state: 'in-use',
    createdAt: new Date(),
};
// --- End Test Data ---


describe('Device Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset repository mocks to default behaviors for each test
        vi.mocked(deviceRepository.findById).mockResolvedValue(undefined); 
        vi.mocked(deviceRepository.findByName).mockResolvedValue(undefined); 
        vi.mocked(deviceRepository.findAll).mockResolvedValue([]); 
        vi.mocked(deviceRepository.create).mockResolvedValue(mockDeviceAvailable);
        vi.mocked(deviceRepository.update).mockResolvedValue(null);
        vi.mocked(deviceRepository.delete).mockResolvedValue(false); 
    });

    describe('updateDevice', () => {

        // Domain Validation: Name property cannot be updated if the device is in-use
        it('should throw error if name is updated for an in-use device', async () => {
            const {id} = mockDeviceInUse;
            const updateData = { name: 'Updated Name' };
            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceInUse);

            await expect(deviceService.updateDevice(id, updateData))
                .rejects.toThrow("Cannot update name for a device that is 'in-use'");

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.update).not.toHaveBeenCalled(); // Ensure update wasn't called due to validation failure
        });

        // Domain Validation: Brand property cannot be updated if the device is in-use
        it('should throw error if brand is updated for an in-use device', async () => {
            const {id} = mockDeviceInUse;
            const updateData = { brand: 'Sony' as const};
            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceInUse);

            await expect(deviceService.updateDevice(id, updateData))
                .rejects.toThrow("Cannot update brand for a device that is 'in-use'");

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.update).not.toHaveBeenCalled();
        });

        // Domain Validation: Creation time cannot be updated
        it('should throw error if createdAt is updated', async () => {
            const {id} = mockDeviceAvailable;
            const updateData: Partial<Device> = { createdAt: new Date() };
            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceAvailable);

            await expect(deviceService.updateDevice(id, updateData))
              .rejects.toThrow('Cannot update createdAt property');

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.update).not.toHaveBeenCalled();
        });

        it('should allow updating state of an in-use device', async () => {
            const {id} = mockDeviceInUse;
            const updateData = { state: 'inactive' as const };
            const expectedUpdatedDevice = { ...mockDeviceInUse, state: 'inactive' };

            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceInUse);
            // Simulate successful update returning the modified device
            vi.mocked(deviceRepository.update).mockResolvedValueOnce(expectedUpdatedDevice as Device);

            const result = await deviceService.updateDevice(id, updateData);

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.update).toHaveBeenCalledWith(id, updateData); // Verify correct data passed to repo
            expect(result).toEqual(expectedUpdatedDevice);
        });

         it('should return null if repository update returns null', async () => {
            const {id} = mockDeviceAvailable;
            const updateData = { name: 'Updated Name' };

            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceAvailable);
            // Ensure no conflicting name is found during the update check
            vi.mocked(deviceRepository.findByName).mockResolvedValueOnce(undefined);
            // Simulate the repository indicating update failure (e.g., row not found)
            vi.mocked(deviceRepository.update).mockResolvedValueOnce(null);

            const result = await deviceService.updateDevice(id, updateData);

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.update).toHaveBeenCalledWith(id, updateData);
            expect(result).toBeNull(); // Service should propagate the null return
        });

        // Domain Validation: Name uniqueness check during update
        it('should throw error if updated name already exists for another device', async () => {
            const { id } = mockDeviceAvailable;
            const conflictingUpdateData = { name: mockDeviceInUse.name }; // Attempt to use name of mockDeviceInUse

            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceAvailable);
            // Simulate finding a different device with the target name
            vi.mocked(deviceRepository.findByName).mockResolvedValueOnce(mockDeviceInUse);

            await expect(deviceService.updateDevice(id, conflictingUpdateData))
                .rejects.toThrow(`Device name '${conflictingUpdateData.name}' already exists.`);

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.findByName).toHaveBeenCalledWith(conflictingUpdateData.name);
            expect(deviceRepository.update).not.toHaveBeenCalled(); // Ensure update wasn't called
        });


    });

    describe('deleteDevice', () => {
        // Domain Validation: Device cannot be deleted if it is in-use
        it('should throw error if device is in-use', async () => {
            const {id} = mockDeviceInUse;
            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceInUse);

            await expect(deviceService.deleteDevice(id)).rejects.toThrow("Cannot delete a device that is 'in-use'");

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.delete).not.toHaveBeenCalled(); // Ensure delete wasn't called
        });

        it('should call repository delete and return true if device is available and delete succeeds', async () => {
            const {id} = mockDeviceAvailable;
            vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceAvailable);
            // Simulate repository confirming successful deletion
            vi.mocked(deviceRepository.delete).mockResolvedValueOnce(true);

            const result = await deviceService.deleteDevice(id);

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.delete).toHaveBeenCalledWith(id);
            expect(result).toBe(true);
        });

         it('should return false if device is available but repository delete fails', async () => {
            const {id} = mockDeviceAvailable;
             vi.mocked(deviceRepository.findById).mockResolvedValueOnce(mockDeviceAvailable);
            // Simulate repository indicating deletion failure (e.g., 0 rows affected)
            vi.mocked(deviceRepository.delete).mockResolvedValueOnce(false);

            const result = await deviceService.deleteDevice(id);

            expect(deviceRepository.findById).toHaveBeenCalledWith(id);
            expect(deviceRepository.delete).toHaveBeenCalledWith(id);
            expect(result).toBe(false); // Service should propagate the false return
        });

         it('should return false if device is not found by findById', async () => {
            const nonExistentId = 999;
            // findById mock already defaults to undefined in beforeEach
            // vi.mocked(deviceRepository.findById).mockResolvedValueOnce(undefined);

            const result = await deviceService.deleteDevice(nonExistentId);

            expect(deviceRepository.findById).toHaveBeenCalledWith(nonExistentId);
            expect(deviceRepository.delete).not.toHaveBeenCalled(); // Delete shouldn't be called if device not found
            expect(result).toBe(false);
        });
    });

});