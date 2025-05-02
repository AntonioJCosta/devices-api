import { deviceService } from '../services/deviceService'
import { createDeviceSchema, updateDeviceSchema, type CreateDeviceInput, type UpdateDeviceInput } from '../validations/deviceValidation'
import type { Context } from 'elysia'

export const deviceController = {
  async create(ctx: Context<{ body: unknown }>) { // Unknown body type to validate later
    try {
      const validationResult = createDeviceSchema.safeParse(ctx.body)

      if (!validationResult.success) {
        ctx.set.status = 400
        return { error: 'Invalid input data', details: validationResult.error.format() }
      }

      const newDevice = await deviceService.createDevice(validationResult.data)
      ctx.set.status = 201
      return newDevice
    } catch (error) {
      // Log the actual error for debugging
      console.error("Error creating device:", error);
      ctx.set.status = 500
      return { error: 'Failed to create device' }
    }
  },

  async getAll(ctx: Context<{ query: { brand?: string; state?: string } }>) {
    try {
      const devices = await deviceService.getAllDevices(ctx.query)
      return devices
    } catch (error) {
      ctx.set.status = 500
      return { error: 'Failed to fetch devices' }
    }
  },

  async getById(ctx: Context<{ params: { id: string } }>) {
    try {
      const id = parseInt(ctx.params.id, 10)
      if (isNaN(id)) {
        ctx.set.status = 400
        return { error: 'Invalid device ID' }
      }
      const device = await deviceService.getDeviceById(id)
      if (!device) {
        ctx.set.status = 404
        return { error: 'Device not found' }
      }
      return device
    } catch (error) {
      ctx.set.status = 500
      return { error: 'Failed to fetch device' }
    }
  },

  async update(ctx: Context<{ params: { id: string }, body: unknown }>) { // Accept unknown body
    try {
      const id = parseInt(ctx.params.id, 10)
       if (isNaN(id)) {
        ctx.set.status = 400
        return { error: 'Invalid device ID' }
      }

      // Manually validate the body using Zod
      const validationResult = updateDeviceSchema.safeParse(ctx.body)

      if (!validationResult.success) {
        ctx.set.status = 400
        // Return Zod's formatted errors
        return { error: 'Invalid input data', details: validationResult.error.format() }
      }

      // Use the validated data
      const validatedData = validationResult.data

      // Basic check for empty update payload (after validation)
      if (Object.keys(validatedData).length === 0) {
          ctx.set.status = 400;
          return { error: 'Update payload cannot be empty' };
      }

      const updatedDevice = await deviceService.updateDevice(id, validatedData)
      if (!updatedDevice) {
        ctx.set.status = 404
        return { error: 'Device not found' }
      }
      return updatedDevice
    } catch (error: any) {
        // Handle specific domain validation errors from the service
        if (error.message.includes("Cannot update") || error.message.includes("Cannot delete")) {
             ctx.set.status = 400; // Bad Request due to business rule violation
             return { error: error.message };
        }
      // Log the actual error for debugging
      console.error("Error updating device:", error);
      ctx.set.status = 500
      return { error: 'Failed to update device' }
    }
  },

  async delete(ctx: Context<{ params: { id: string } }>) {
    try {
      const id = parseInt(ctx.params.id, 10)
       if (isNaN(id)) {
        ctx.set.status = 400
        return { error: 'Invalid device ID' }
      }

      const success = await deviceService.deleteDevice(id)
      if (!success) {
        // This case might be handled by the service throwing an error if not found,
        // depending on the desired behavior (404 vs. specific error).
        // If the service returns false for not found:
         ctx.set.status = 404;
         return { error: 'Device not found' };
      }
      ctx.set.status = 204 // No Content
    } catch (error: any) {
       // Handle specific domain validation errors from the service
        if (error.message.includes("Cannot delete")) {
             ctx.set.status = 400; // Bad Request due to business rule violation
             return { error: error.message };
        }
      ctx.set.status = 500
      return { error: 'Failed to delete device' }
    }
  },
}