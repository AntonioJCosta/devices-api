import { deviceRepository } from '../repositories/deviceRepository'
import type { Device, NewDevice } from '../../drizzle/schema'
// Import the new input type
import type { CreateDeviceInput, UpdateDeviceInput, FullUpdateDeviceInput } from '../validations/deviceValidation'
import logger from '../config/logger'

export const deviceService = {
  /**
   * Creates a new device.
   * @param data - The data for the new device.
   * @returns The created device.
   * @throws Error if the repository fails to create the device.
   */
  async createDevice(data: CreateDeviceInput): Promise<Device> {
    try {
        return await deviceRepository.create(data);
    } catch(error) {
        logger.error({ err: error, data }, "Error in repository create");
        // Propagate a generic error to the controller layer
        throw new Error('Failed to create a new device');
    }
  },

  /**
   * Retrieves all devices, optionally applying filters.
   * @param filters - Optional filters for brand and state.
   * @returns A list of devices matching the filters.
   */
  async getAllDevices(filters: { brand?: string; state?: string }): Promise<Device[]> {
    return await deviceRepository.findAll(filters)
  },

  /**
   * Retrieves a single device by its ID.
   * @param id - The ID of the device to retrieve.
   * @returns The device if found, otherwise undefined.
   */
  async getDeviceById(id: number): Promise<Device | undefined> {
    return await deviceRepository.findById(id)
  },

  /**
   * Partially updates an existing device.
   * @param id - The ID of the device to update.
   * @param data - The partial data to update.
   * @returns The updated device, or null if not found.
   * @throws Error on business rule violations (e.g., updating name/brand while in-use, duplicate name).
   */
  async updateDevice(id: number, data: UpdateDeviceInput): Promise<Device | null> {
    const existingDevice = await deviceRepository.findById(id)
    if (!existingDevice) {
      return null
    }

    // --- Name Uniqueness Check for Update ---
    if (data.name && data.name !== existingDevice.name) {
      const conflictingDevice = await deviceRepository.findByName(data.name);
      if (conflictingDevice && conflictingDevice.id !== id) {
         logger.warn({ deviceId: id, newName: data.name, conflictingId: conflictingDevice.id }, "Attempted to update device name to one that already exists");
         throw new Error(`Device name '${data.name}' already exists.`);
      }
    }

    // Domain Validation: Prevent modification of name and brand for devices currently in use.
    if (existingDevice.state === 'in-use') {
      if (data.name && data.name !== existingDevice.name) {
        throw new Error("Cannot update name for a device that is 'in-use'")
      }
      if (data.brand && data.brand !== existingDevice.brand) {
        throw new Error("Cannot update brand for a device that is 'in-use'")
      }
    }

    try {
        const updated = await deviceRepository.update(id, data);
        if (!updated) {
            logger.warn({ deviceId: id, data }, "Repository returned null unexpectedly during partial update after existence check");
            return null;
        }
        return updated;
    } catch (error: any) {
         logger.error({ err: error, deviceId: id, data }, "Error during repository partial update");
         throw error;
    }
  },

  /**
   * Fully updates (replaces) an existing device.
   * @param id - The ID of the device to update.
   * @param data - The full data for the device (all fields required).
   * @returns The updated device, or null if not found.
   * @throws Error on business rule violations (e.g., updating name/brand while in-use, duplicate name).
   */
  async updateFullDevice(id: number, data: FullUpdateDeviceInput): Promise<Device | null> {
    const existingDevice = await deviceRepository.findById(id);
    if (!existingDevice) {
      return null;
    }

    // --- Name Uniqueness Check for Update ---
    // Check only if the name is actually changing
    if (data.name !== existingDevice.name) {
      const conflictingDevice = await deviceRepository.findByName(data.name);
      if (conflictingDevice && conflictingDevice.id !== id) {
        logger.warn({ deviceId: id, newName: data.name, conflictingId: conflictingDevice.id }, "Attempted to update device name to one that already exists (full update)");
        throw new Error(`Device name '${data.name}' already exists.`);
      }
    }

    // Domain Validation: Prevent modification of name and brand for devices currently in use,
    // UNLESS the state is also being changed away from 'in-use' in the same request.
    if (existingDevice.state === 'in-use' && data.state === 'in-use') {
      if (data.name !== existingDevice.name) {
        throw new Error("Cannot update name for a device that remains 'in-use'");
      }
      if (data.brand !== existingDevice.brand) {
        throw new Error("Cannot update brand for a device that remains 'in-use'");
      }
    }

    try {
        const updated = await deviceRepository.update(id, data);
         if (!updated) {
            logger.warn({ deviceId: id, data }, "Repository returned null unexpectedly during full update after existence check");
            return null; 
        }
        return updated;
    } catch (error: any) {
         logger.error({ err: error, deviceId: id, data }, "Error during repository full update");
         throw error;
    }
  },

  /**
   * Deletes a device by its ID.
   * @param id - The ID of the device to delete.
   * @returns True if the device was deleted, false if the device was not found.
   * @throws Error if attempting to delete a device that is 'in-use'.
   */
  async deleteDevice(id: number): Promise<boolean> {
    const existingDevice = await deviceRepository.findById(id)
    if (!existingDevice) {
      return false
    }

    // Domain Validation: Prevent deletion of devices currently in use.
    if (existingDevice.state === 'in-use') {
      throw new Error("Cannot delete a device that is 'in-use'")
    }

    return await deviceRepository.delete(id)
  },
}