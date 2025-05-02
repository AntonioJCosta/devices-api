import { z } from 'zod'

// --- Enums ---
export const deviceBrandEnum = z.enum(['Apple', 'Samsung', 'Google', 'Sony', 'Huawei'], {
    errorMap: () => ({ message: "Brand must be one of 'Apple', 'Samsung', 'Google', 'Sony', 'Huawei'" })
});

export const deviceStateEnum = z.enum(['available', 'in-use', 'inactive'], {
    errorMap: () => ({ message: "State must be one of 'available', 'in-use', 'inactive'" })
});

const baseDeviceSchema = z.object({
  name: z.string().min(5, "Name must be at least 5 characters long"),
  brand: deviceBrandEnum,
  state: deviceStateEnum,
})


/** Schema for creating a new device (requires all fields) */
export const createDeviceSchema = baseDeviceSchema;

/** Schema for fully updating a device (requires all fields) */
export const fullUpdateDeviceSchema = baseDeviceSchema; // PUT requires all fields

/** Schema for partially updating a device (all fields optional) */
export const updateDeviceSchema = baseDeviceSchema.partial();

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>
export type FullUpdateDeviceInput = z.infer<typeof fullUpdateDeviceSchema>