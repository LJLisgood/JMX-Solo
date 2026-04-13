package com.jmx.manager.service;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.*;
import com.jmx.manager.dto.StorageItem;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

@Service
public class CloudflareR2Service {

    @Value("${cloudflare.r2.endpoint}")
    private String endpoint;

    @Value("${cloudflare.r2.access-key}")
    private String accessKey;

    @Value("${cloudflare.r2.secret-key}")
    private String secretKey;

    @Value("${cloudflare.r2.bucket}")
    private String bucketName;

    private AmazonS3 s3Client;

    @PostConstruct
    public void init() {
        // Skip initialization if placeholders are present
        if (accessKey.contains("your_access_key") || secretKey.contains("your_secret_key")) {
            System.out.println("WARN: Cloudflare R2 credentials not provided. S3 Upload will fail if used.");
            return;
        }
        BasicAWSCredentials credentials = new BasicAWSCredentials(accessKey, secretKey);
        s3Client = AmazonS3ClientBuilder.standard()
                .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(endpoint, "auto"))
                .withCredentials(new AWSStaticCredentialsProvider(credentials))
                .build();
    }

    public String uploadFile(File file, String keyName) {
        if (s3Client == null) {
            throw new RuntimeException("S3 Client is not initialized. Please provide R2 credentials in application.yml.");
        }
        s3Client.putObject(new PutObjectRequest(bucketName, keyName, file));
        return endpoint + "/" + bucketName + "/" + keyName;
    }

    public List<StorageItem> listObjects(String prefix) {
        if (s3Client == null) return new ArrayList<>();
        if (prefix == null || prefix.isEmpty()) prefix = "jmx/";
        if (!prefix.endsWith("/")) prefix += "/";

        ListObjectsV2Request req = new ListObjectsV2Request()
                .withBucketName(bucketName)
                .withPrefix(prefix)
                .withDelimiter("/");

        ListObjectsV2Result result = s3Client.listObjectsV2(req);
        List<StorageItem> items = new ArrayList<>();

        for (String commonPrefix : result.getCommonPrefixes()) {
            String name = extractName(commonPrefix);
            items.add(new StorageItem(commonPrefix, name, true, 0));
        }

        for (S3ObjectSummary summary : result.getObjectSummaries()) {
            if (summary.getKey().equals(prefix)) continue; // skip the folder itself
            String name = extractName(summary.getKey());
            items.add(new StorageItem(summary.getKey(), name, false, summary.getSize()));
        }
        return items;
    }

    public void createFolder(String folderKey) {
        if (s3Client == null) return;
        if (!folderKey.endsWith("/")) folderKey += "/";
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(0);
        s3Client.putObject(new PutObjectRequest(bucketName, folderKey, new ByteArrayInputStream(new byte[0]), metadata));
    }

    public void deleteObject(String key) {
        if (s3Client == null) return;
        s3Client.deleteObject(bucketName, key);
    }

    public File downloadToLocal(String key, String localDir) throws Exception {
        if (s3Client == null) throw new RuntimeException("S3 Client not initialized");
        S3Object object = s3Client.getObject(new GetObjectRequest(bucketName, key));
        File localFile = new File(localDir, new File(key).getName());
        Files.copy(object.getObjectContent(), localFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
        return localFile;
    }

    private String extractName(String key) {
        if (key.endsWith("/")) key = key.substring(0, key.length() - 1);
        int lastSlash = key.lastIndexOf('/');
        return lastSlash >= 0 ? key.substring(lastSlash + 1) : key;
    }
}
