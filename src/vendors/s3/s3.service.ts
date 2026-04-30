import { S3Client } from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";

@Injectable()
export class S3Service {
  public s3: S3Client;

  constructor() {
    this.s3 = new S3Client({
      region: "us-east-1",
      endpoint: "https://eu-central-1.linodeobjects.com",
           credentials: {
        accessKeyId: "BO2MFYSYNZCFUV9U8LTN",
        secretAccessKey: "jaYJNU1qJIV1mIHnjHqmYOY5BfiECurRAiJo0nwV",
      },
    });
  }
}