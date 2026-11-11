import io


class NoSuchKey(Exception):
    response = {"Error": {"Code": "NoSuchKey"}}


class FakeS3:
    """Minimal in-memory stand-in for a boto3 S3 client (paginates like the real one)."""

    def __init__(self, page_size=3):
        self.objs, self.page_size = {}, page_size

    def put_object(self, Bucket, Key, Body, ContentType=None):  # noqa: N803 - boto3 naming
        self.objs[Key] = Body

    def get_object(self, Bucket, Key):  # noqa: N803
        if Key not in self.objs:
            raise NoSuchKey()
        return {"Body": io.BytesIO(self.objs[Key])}

    def list_objects_v2(self, Bucket, Prefix, ContinuationToken=None):  # noqa: N803
        keys = sorted(k for k in self.objs if k.startswith(Prefix))
        start = int(ContinuationToken or 0)
        chunk = keys[start : start + self.page_size]
        more = start + self.page_size < len(keys)
        out = {"Contents": [{"Key": k} for k in chunk], "IsTruncated": more}
        if more:
            out["NextContinuationToken"] = str(start + self.page_size)
        return out
