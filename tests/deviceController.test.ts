import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deviceController } from '../src/controllers/deviceController'
import { deviceService } from '../src/services/deviceService'
// Import schemas for mocking their methods
import { createDeviceSchema, updateDeviceSchema, fullUpdateDeviceSchema } from '../src/validations/deviceValidation'
import type { Context, Cookie } from 'elysia'
import TypedResponse from 'elysia'
import type { Device } from '../drizzle/schema'

// Mock the entire device service module
vi.mock('../src/services/deviceService', () => ({
    deviceService: {
        createDevice: vi.fn(),
        getAllDevices: vi.fn(),
        getDeviceById: vi.fn(),
        updateDevice: vi.fn(),
        updateFullDevice: vi.fn(), // Added mock for updateFull
        deleteDevice: vi.fn(),
    }
}));

// Mock the config/env module
vi.mock('../src/config/env', () => ({
    env: {
        // Provide the mocked DB_URL here
        DB_URL: 'postgresql://testuser:testpass@localhost:5432/testdb',
        // Include other required env variables with default or mock values
        // to satisfy the original envSchema if it's imported elsewhere.
        APP_PORT: 3001,
        APP_HOST: 'localhost',
        LOG_LEVEL: 'info',
    },
    // Mock NODE_ENV if necessary, otherwise it defaults based on process.env or 'local'
    NODE_ENV: process.env.NODE_ENV || 'test',
}));

// Mock only the 'safeParse' methods of validation schemas
// This allows testing controller logic independent of Zod's specific implementation
vi.mock('../src/validations/deviceValidation', async (importOriginal) => {
     const actual = await importOriginal<typeof import('../src/validations/deviceValidation')>();
    return {
        ...actual, // Keep actual schema objects/types if needed elsewhere
        createDeviceSchema: {
            ...actual.createDeviceSchema, // Keep other schema properties if any
            safeParse: vi.fn()
        },
        updateDeviceSchema: {
            ...actual.updateDeviceSchema,
            safeParse: vi.fn()
        },
        fullUpdateDeviceSchema: { // Added mock for fullUpdate
            ...actual.fullUpdateDeviceSchema,
            safeParse: vi.fn()
        }
    };
});

// --- Test Utilities ---

// Define a type for the 'set' property of the mock context for stricter typing
type MockContextSet = {
    status?: number | string | undefined;
    headers?: Record<string, string> | undefined;
    redirect?: string | undefined;
    cookie?: Record<string, Cookie<any>>;
} & TypedResponse<any, any>;

// Define a base type for the mock context, allowing specific types for params, body, query
type MockContext<
    ParamsType = Record<string, any>,
    BodyType = any,
    QueryType = Record<string, any>
> = Partial<Omit<Context<any>, 'set' | 'params' | 'body' | 'query'>> & {
    set: MockContextSet;
    params: ParamsType;
    body: BodyType;
    query: QueryType;
};

// Helper function to create a mock Elysia context object for testing controller methods
const mockContext = <
    ParamsType = Record<string, any>,
    BodyType = any,
    QueryType = Record<string, any>
>(
    params: ParamsType,
    body: BodyType | undefined = undefined,
    query: QueryType | undefined = undefined
): MockContext<ParamsType, BodyType, QueryType> => ({
    params,
    body: body as BodyType, // Cast needed as default is undefined
    query: query || ({} as QueryType), // Ensure query is an object
    set: {
        status: 200 // Default OK status
    } as MockContextSet,
    // Add other context properties if needed by controllers (e.g., request, store)
    request: {} as any,
    store: {} as any,
});


describe('Device Controller', () => {
    // --- Test Data ---
    const mockDeviceAvailable: Device = {
        id: 1,
        name: 'Test Device Available',
        brand: 'Samsung',
        state: 'available',
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
    };
     const mockDeviceInUse: Device = {
        id: 2,
        name: 'Test Device In Use',
        brand: 'Apple',
        state: 'in-use',
        createdAt: new Date('2025-01-16T11:00:00.000Z'),
    };

    // --- Hooks ---
    beforeEach(() => {
        // Reset mocks before each test to ensure isolation
        vi.clearAllMocks();

        // Setup default successful mock implementations
        vi.mocked(createDeviceSchema.safeParse).mockReturnValue({ success: true, data: {} } as any);
        vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: {} } as any);
        vi.mocked(fullUpdateDeviceSchema.safeParse).mockReturnValue({ success: true, data: {} } as any); // Added default for fullUpdate
        vi.mocked(deviceService.createDevice).mockResolvedValue(mockDeviceAvailable);
        vi.mocked(deviceService.getAllDevices).mockResolvedValue([mockDeviceAvailable, mockDeviceInUse]);
        vi.mocked(deviceService.getDeviceById).mockResolvedValue(mockDeviceAvailable);
        vi.mocked(deviceService.updateDevice).mockResolvedValue(mockDeviceAvailable);
        vi.mocked(deviceService.updateFullDevice).mockResolvedValue(mockDeviceAvailable); // Added default for updateFull
        vi.mocked(deviceService.deleteDevice).mockResolvedValue(true); // Assume success returns true
    });

    // --- Test Suites ---

    describe('create', () => {
        const validInput = { name: 'New Device', brand: 'Samsung' as const, state: 'available' as const };
        const createdDevice = { ...validInput, id: 3, createdAt: new Date() };

        it('should return 400 if validation fails', async () => {
            const validationError = { success: false, error: { format: () => ({ _errors: ['Validation failed'] }) } };
            vi.mocked(createDeviceSchema.safeParse).mockReturnValue(validationError as any);
            const ctx = mockContext({}, { invalid: 'data' });

            const result = await deviceController.create(ctx as any);

            expect(createDeviceSchema.safeParse).toHaveBeenCalledWith({ invalid: 'data' });
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid input data', details: { _errors: ['Validation failed'] } });
            expect(deviceService.createDevice).not.toHaveBeenCalled();
        });

        it('should call service and return 201 on successful creation', async () => {
            vi.mocked(createDeviceSchema.safeParse).mockReturnValue({ success: true, data: validInput } as any);
            vi.mocked(deviceService.createDevice).mockResolvedValue(createdDevice);
            const ctx = mockContext({}, validInput);

            const result = await deviceController.create(ctx as any);

            expect(createDeviceSchema.safeParse).toHaveBeenCalledWith(validInput);
            expect(deviceService.createDevice).toHaveBeenCalledWith(validInput);
            expect(ctx.set.status).toBe(201);
            expect(result).toEqual(createdDevice);
        });

         it('should return 409 if service throws duplicate name error', async () => {
            const errorMsg = "Device name 'New Device' already exists.";
            vi.mocked(createDeviceSchema.safeParse).mockReturnValue({ success: true, data: validInput } as any);
            vi.mocked(deviceService.createDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext({}, validInput);

            const result = await deviceController.create(ctx as any);

            expect(deviceService.createDevice).toHaveBeenCalledWith(validInput);
            expect(ctx.set.status).toBe(409);
            expect(result).toEqual({ error: errorMsg });
        });


        it('should return 500 if service throws an unexpected error', async () => {
            vi.mocked(createDeviceSchema.safeParse).mockReturnValue({ success: true, data: validInput } as any);
            vi.mocked(deviceService.createDevice).mockRejectedValue(new Error('Unexpected DB error'));
            const ctx = mockContext({}, validInput);

            const result = await deviceController.create(ctx as any);

            expect(deviceService.createDevice).toHaveBeenCalledWith(validInput);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to create device' }); // Check for generic error message
        });
    });

    describe('getAll', () => {
        it('should call service with query params and return devices', async () => {
            const query = { brand: 'Samsung', state: 'available' as const };
            const expectedDevices = [mockDeviceAvailable];
            vi.mocked(deviceService.getAllDevices).mockResolvedValue(expectedDevices);
            // Provide specific types for context if needed, otherwise defaults work
            const ctx = mockContext<Record<string, any>, undefined, typeof query>({}, undefined, query);

            const result = await deviceController.getAll(ctx as any);

            expect(deviceService.getAllDevices).toHaveBeenCalledWith(query);
            expect(result).toEqual(expectedDevices);
            expect(ctx.set.status).toBe(200);
        });

        it('should return 500 if service throws an error', async () => {
            vi.mocked(deviceService.getAllDevices).mockRejectedValue(new Error('Fetch error'));
            const ctx = mockContext({}, undefined, {});

            const result = await deviceController.getAll(ctx as any);

            expect(deviceService.getAllDevices).toHaveBeenCalledWith({});
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to fetch devices' });
        });
    });

    describe('getById', () => {
        // Test assumes Elysia's t.Numeric() handles non-numeric params before controller execution
        // No need for explicit 'abc' test if route schema prevents it

        it('should call service with ID and return device if found', async () => {
            const deviceId = mockDeviceAvailable.id;
            vi.mocked(deviceService.getDeviceById).mockResolvedValue(mockDeviceAvailable);
            // Context params type matches controller signature
            const ctx = mockContext<{ id: number }>({ id: deviceId });

            const result = await deviceController.getById(ctx as any);

            expect(deviceService.getDeviceById).toHaveBeenCalledWith(deviceId);
            expect(result).toEqual(mockDeviceAvailable);
            expect(ctx.set.status).toBe(200);
        });

        it('should return 404 if service returns undefined (device not found)', async () => {
            const nonExistentId = 999;
            vi.mocked(deviceService.getDeviceById).mockResolvedValue(undefined);
            const ctx = mockContext<{ id: number }>({ id: nonExistentId });

            const result = await deviceController.getById(ctx as any);

            expect(deviceService.getDeviceById).toHaveBeenCalledWith(nonExistentId);
            expect(ctx.set.status).toBe(404);
            expect(result).toEqual({ error: 'Device not found' });
        });

        it('should return 500 if service throws an error', async () => {
            const deviceId = mockDeviceAvailable.id;
            vi.mocked(deviceService.getDeviceById).mockRejectedValue(new Error('Failed to fetch device'));
            const ctx = mockContext<{ id: number }>({ id: deviceId });

            const result = await deviceController.getById(ctx as any);

            expect(deviceService.getDeviceById).toHaveBeenCalledWith(deviceId);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to fetch device' }); // Check specific error message if controller provides it
        });
    });

    describe('update (PATCH)', () => {
        const deviceId = mockDeviceAvailable.id;
        const updateData = { name: 'Updated Name' };
        const updatedDevice = { ...mockDeviceAvailable, ...updateData };

        // Test assumes Elysia's t.Numeric() handles non-numeric params

        it('should return 400 if validation fails', async () => {
            const validationError = { success: false, error: { format: () => ({ _errors: ['Invalid state'] }) } };
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue(validationError as any);
            const ctx = mockContext<{ id: number }>({ id: deviceId }, { state: 'broken' });

            const result = await deviceController.update(ctx as any);

            expect(updateDeviceSchema.safeParse).toHaveBeenCalledWith({ state: 'broken' });
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid input data', details: { _errors: ['Invalid state'] } });
            expect(deviceService.updateDevice).not.toHaveBeenCalled();
        });

         it('should return 400 if validated data is empty (no fields to update)', async () => {
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: {} } as any);
            const ctx = mockContext<{ id: number }>({ id: deviceId }, {}); // Body might be empty

            const result = await deviceController.update(ctx as any);

            expect(updateDeviceSchema.safeParse).toHaveBeenCalledWith({});
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Update payload cannot be empty' });
            expect(deviceService.updateDevice).not.toHaveBeenCalled();
        });

        it('should call service and return 200 on successful update', async () => {
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            vi.mocked(deviceService.updateDevice).mockResolvedValue(updatedDevice);
            const ctx = mockContext<{ id: number }>({ id: deviceId }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(updateDeviceSchema.safeParse).toHaveBeenCalledWith(updateData);
            expect(deviceService.updateDevice).toHaveBeenCalledWith(deviceId, updateData);
            expect(ctx.set.status).toBe(200);
            expect(result).toEqual(updatedDevice);
        });

        it('should return 404 if service indicates device not found', async () => {
            const nonExistentId = 999;
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            // Simulate service throwing a specific "not found" error or returning null/undefined
            vi.mocked(deviceService.updateDevice).mockRejectedValue(new Error('Device not found'));
            const ctx = mockContext<{ id: number }>({ id: nonExistentId }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(deviceService.updateDevice).toHaveBeenCalledWith(nonExistentId, updateData);
            expect(ctx.set.status).toBe(404); // Controller should map this error to 404
            expect(result).toEqual({ error: 'Device not found' });
        });

        it('should return 400 if service throws domain validation error (e.g., update in-use)', async () => {
            const inUseDeviceId = mockDeviceInUse.id;
            const invalidUpdate = { name: 'New Name For In-Use Device' };
            const errorMsg = "Cannot update name for a device that is 'in-use'";
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: invalidUpdate } as any);
            vi.mocked(deviceService.updateDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext<{ id: number }>({ id: inUseDeviceId }, invalidUpdate);

            const result = await deviceController.update(ctx as any);

            expect(deviceService.updateDevice).toHaveBeenCalledWith(inUseDeviceId, invalidUpdate);
            expect(ctx.set.status).toBe(400); // Or 409 depending on specific rule
            expect(result).toEqual({ error: errorMsg });
        });

         it('should return 409 if service throws duplicate name error', async () => {
            const errorMsg = "Device name 'Updated Name' already exists.";
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            vi.mocked(deviceService.updateDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext<{ id: number }>({ id: deviceId }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(deviceService.updateDevice).toHaveBeenCalledWith(deviceId, updateData);
            expect(ctx.set.status).toBe(409);
            expect(result).toEqual({ error: errorMsg });
        });


        it('should return 500 if service throws an unexpected error', async () => {
            vi.mocked(updateDeviceSchema.safeParse).mockReturnValue({ success: true, data: updateData } as any);
            vi.mocked(deviceService.updateDevice).mockRejectedValue(new Error('Unexpected DB Error'));
            const ctx = mockContext<{ id: number }>({ id: deviceId }, updateData);

            const result = await deviceController.update(ctx as any);

            expect(deviceService.updateDevice).toHaveBeenCalledWith(deviceId, updateData);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to update device' });
        });
    });

    // Add describe block for updateFull (PUT) similar to update (PATCH)
    describe('updateFull (PUT)', () => {
        const deviceId = mockDeviceAvailable.id;
        const fullUpdateData = { name: 'Fully Updated', brand: 'Google' as const, state: 'inactive' as const };
        const updatedDevice = { ...mockDeviceAvailable, ...fullUpdateData };

        // Test assumes Elysia's t.Numeric() handles non-numeric params

        it('should return 400 if validation fails', async () => {
            const validationError = { success: false, error: { format: () => ({ _errors: ['Missing brand'] }) } };
            vi.mocked(fullUpdateDeviceSchema.safeParse).mockReturnValue(validationError as any);
            const incompleteData = { name: 'Incomplete', state: 'available' as const };
            const ctx = mockContext<{ id: number }>({ id: deviceId }, incompleteData);

            const result = await deviceController.updateFull(ctx as any);

            expect(fullUpdateDeviceSchema.safeParse).toHaveBeenCalledWith(incompleteData);
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: 'Invalid input data', details: { _errors: ['Missing brand'] } });
            expect(deviceService.updateFullDevice).not.toHaveBeenCalled();
        });

        it('should call service and return 200 on successful full update', async () => {
            vi.mocked(fullUpdateDeviceSchema.safeParse).mockReturnValue({ success: true, data: fullUpdateData } as any);
            vi.mocked(deviceService.updateFullDevice).mockResolvedValue(updatedDevice);
            const ctx = mockContext<{ id: number }>({ id: deviceId }, fullUpdateData);

            const result = await deviceController.updateFull(ctx as any);

            expect(fullUpdateDeviceSchema.safeParse).toHaveBeenCalledWith(fullUpdateData);
            expect(deviceService.updateFullDevice).toHaveBeenCalledWith(deviceId, fullUpdateData);
            expect(ctx.set.status).toBe(200);
            expect(result).toEqual(updatedDevice);
        });

        it('should return 404 if service indicates device not found', async () => {
            const nonExistentId = 999;
            vi.mocked(fullUpdateDeviceSchema.safeParse).mockReturnValue({ success: true, data: fullUpdateData } as any);
            vi.mocked(deviceService.updateFullDevice).mockRejectedValue(new Error('Device not found'));
            const ctx = mockContext<{ id: number }>({ id: nonExistentId }, fullUpdateData);

            const result = await deviceController.updateFull(ctx as any);

            expect(deviceService.updateFullDevice).toHaveBeenCalledWith(nonExistentId, fullUpdateData);
            expect(ctx.set.status).toBe(404);
            expect(result).toEqual({ error: 'Device not found' });
        });

        it('should return 400 if service throws domain validation error', async () => {
            const inUseDeviceId = mockDeviceInUse.id;
            // Example: Trying to change name while keeping state 'in-use' might be disallowed
            const invalidUpdate = { ...mockDeviceInUse, name: 'New Name For In-Use' };
            const errorMsg = "Cannot update name for a device that remains 'in-use'";
            vi.mocked(fullUpdateDeviceSchema.safeParse).mockReturnValue({ success: true, data: invalidUpdate } as any);
            vi.mocked(deviceService.updateFullDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext<{ id: number }>({ id: inUseDeviceId }, invalidUpdate);

            const result = await deviceController.updateFull(ctx as any);

            expect(deviceService.updateFullDevice).toHaveBeenCalledWith(inUseDeviceId, invalidUpdate);
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: errorMsg });
        });

         it('should return 409 if service throws duplicate name error', async () => {
            const errorMsg = "Device name 'Fully Updated' already exists.";
            vi.mocked(fullUpdateDeviceSchema.safeParse).mockReturnValue({ success: true, data: fullUpdateData } as any);
            vi.mocked(deviceService.updateFullDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext<{ id: number }>({ id: deviceId }, fullUpdateData);

            const result = await deviceController.updateFull(ctx as any);

            expect(deviceService.updateFullDevice).toHaveBeenCalledWith(deviceId, fullUpdateData);
            expect(ctx.set.status).toBe(409);
            expect(result).toEqual({ error: errorMsg });
        });


        it('should return 500 if service throws an unexpected error', async () => {
            vi.mocked(fullUpdateDeviceSchema.safeParse).mockReturnValue({ success: true, data: fullUpdateData } as any);
            vi.mocked(deviceService.updateFullDevice).mockRejectedValue(new Error('Unexpected DB Error'));
            const ctx = mockContext<{ id: number }>({ id: deviceId }, fullUpdateData);

            const result = await deviceController.updateFull(ctx as any);

            expect(deviceService.updateFullDevice).toHaveBeenCalledWith(deviceId, fullUpdateData);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to update device' });
        });
    });


     describe('delete', () => {
         // Test assumes Elysia's t.Numeric() handles non-numeric params

        it('should call service and return 204 on successful delete', async () => {
            const deviceId = mockDeviceAvailable.id;
            vi.mocked(deviceService.deleteDevice).mockResolvedValue(true); // Service indicates success
            const ctx = mockContext<{ id: number }>({ id: deviceId });

            // Use await directly on the promise, check status after
            await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(deviceId);
            expect(ctx.set.status).toBe(204);
            // No body check needed for 204
        });

        it('should return 404 if service indicates device not found', async () => {
            const nonExistentId = 999;
            // Simulate service throwing a specific "not found" error
            vi.mocked(deviceService.deleteDevice).mockRejectedValue(new Error('Device not found'));
            const ctx = mockContext<{ id: number }>({ id: nonExistentId });

            const result = await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(nonExistentId);
            expect(ctx.set.status).toBe(404);
            expect(result).toEqual({ error: 'Device not found' });
        });

        it('should return 400 if service throws domain validation error (e.g., delete in-use)', async () => {
            const inUseDeviceId = mockDeviceInUse.id;
            const errorMsg = "Cannot delete a device that is 'in-use'";
            vi.mocked(deviceService.deleteDevice).mockRejectedValue(new Error(errorMsg));
            const ctx = mockContext<{ id: number }>({ id: inUseDeviceId });

            const result = await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(inUseDeviceId);
            expect(ctx.set.status).toBe(400);
            expect(result).toEqual({ error: errorMsg });
        });

        it('should return 500 if service throws an unexpected error', async () => {
            const deviceId = mockDeviceAvailable.id;
            vi.mocked(deviceService.deleteDevice).mockRejectedValue(new Error('Unexpected DB Error'));
            const ctx = mockContext<{ id: number }>({ id: deviceId });

            const result = await deviceController.delete(ctx as any);

            expect(deviceService.deleteDevice).toHaveBeenCalledWith(deviceId);
            expect(ctx.set.status).toBe(500);
            expect(result).toEqual({ error: 'Failed to delete device' });
        });
    });
});