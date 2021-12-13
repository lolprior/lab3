class StereoCamera {

    constructor(
        eyeSeparation,
        convergence,
        aspectRatio,
        FOV,
        nearClippingDistance,
        farClippingDistance,
    ) {
        this.eyeSeparation = eyeSeparation;
        this.mConvergence = convergence;
        this.mAspectRatio = aspectRatio;
        this.FOV = FOV;
        this.mNearClippingDistance = nearClippingDistance;
        this.mFarClippingDistance = farClippingDistance;   
    }

    ApplyLeftFrustum() {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.FOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.FOV / 2) * this.mConvergence;
        let b = a - this.eyeSeparation / 2;
        let c = a + this.eyeSeparation / 2;

        left = -b * this.mNearClippingDistance / this.mConvergence;
        right = c * this.mNearClippingDistance / this.mConvergence;

        return m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
    }

    ApplyRightFrustum() {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.FOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.FOV / 2) * this.mConvergence;
        let b = a - this.eyeSeparation / 2;
        let c = a + this.eyeSeparation / 2;

        left = -c * this.mNearClippingDistance / this.mConvergence;
        right = b * this.mNearClippingDistance / this.mConvergence;

        return m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
   }
}