export interface IDeliveryChannelPayload {
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface IDeliveryChannel {
  name: string;
  deliver(payload: IDeliveryChannelPayload): Promise<boolean>;
}

export class EmailChannel implements IDeliveryChannel {
  name = "Email";

  async deliver(payload: IDeliveryChannelPayload): Promise<boolean> {
    // Abstracted Email delivery
    console.log(`Delivering Email to ${payload.to}: ${payload.subject}`);
    return true;
  }
}

export class InAppChannel implements IDeliveryChannel {
  name = "InApp";

  async deliver(payload: IDeliveryChannelPayload): Promise<boolean> {
    // Abstracted In-App notification delivery
    console.log(`Delivering In-App to ${payload.to}`);
    return true;
  }
}
